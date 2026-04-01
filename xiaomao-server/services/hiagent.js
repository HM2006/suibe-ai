/**
 * HiAgent API 服务层
 * 封装与 HiAgent 平台 API 的通信逻辑
 *
 * API 文档：https://agent.suibe.edu.cn/platform/doc/api/agent-api-call/agent-api-documentation
 *
 * 流程：
 * 1. create_conversation → 获取 AppConversationID
 * 2. chat_query (SSE) → 流式对话
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// 配置
const API_BASE = process.env.HIAGENT_API_BASE || 'https://agent.suibe.edu.cn/api/proxy/api/v1';
const API_KEY = process.env.HIAGENT_API_KEY || 'd76k0fmlvnd86k4unlqg';

/**
 * 创建 axios 实例
 */
const httpClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Apikey': API_KEY,
  },
});

/**
 * 创建会话
 * @param {string} userId - 用户标识
 * @returns {Promise<string>} AppConversationID
 */
async function createConversation(userId) {
  console.log(`[HiAgent] 创建会话, userId=${userId}`);

  const response = await httpClient.post('/create_conversation', {
    UserID: userId,
  });

  const conversationId = response.data?.Conversation?.AppConversationID;
  if (!conversationId) {
    throw new Error('创建会话失败：未返回 AppConversationID');
  }

  console.log(`[HiAgent] 会话创建成功: ${conversationId}`);
  return conversationId;
}

/**
 * 发送消息（非流式）
 * @param {string} query - 用户消息
 * @param {string} conversationId - 会话 ID
 * @param {string} userId - 用户标识
 * @returns {Promise<{answer: string, conversationId: string, messageId: string}>}
 */
async function sendMessage(query, conversationId, userId = 'default-user') {
  let convId = conversationId;

  // 如果没有会话 ID，先创建一个
  if (!convId) {
    convId = await createConversation(userId);
  }

  console.log(`[HiAgent] 发送消息: "${query.substring(0, 50)}..."`);

  const response = await httpClient.post('/chat_query', {
    Query: query,
    AppConversationID: convId,
    ResponseMode: 'blocking',
    UserID: userId,
  });

  const data = response.data;
  // 非流式返回也是 SSE 格式，取最后一个 message_end 的 answer
  const answer = data?.answer || '暂无回复';

  return {
    answer,
    conversationId: convId,
    messageId: data?.id || uuidv4(),
  };
}

/**
 * 发送消息（流式 SSE）
 * @param {string} query - 用户消息
 * @param {string} conversationId - 会话 ID
 * @param {string} userId - 用户标识
 * @returns {Promise<import('axios').AxiosResponse>} axios 流式响应
 */
async function sendMessageStream(query, conversationId, userId = 'default-user') {
  let convId = conversationId;

  // 如果没有会话 ID，先创建一个
  if (!convId) {
    convId = await createConversation(userId);
  }

  console.log(`[HiAgent] 发送流式消息: "${query.substring(0, 50)}..."`);

  const response = await httpClient.post('/chat_query', {
    Query: query,
    AppConversationID: convId,
    ResponseMode: 'streaming',
    UserID: userId,
  }, {
    headers: {
      'Accept': 'text/event-stream',
    },
    responseType: 'stream',
  });

  // 把 convId 存到 response 对象上，方便后续使用
  response._conversationId = convId;
  return response;
}

/**
 * 解析 HiAgent SSE 事件流
 * HiAgent SSE 格式：每行 "data: {json}"
 * json 中 event 字段标识事件类型
 *
 * @param {import('stream').Readable} stream
 * @param {Function} onMessage - (text: string) => void
 * @param {Function} onComplete - (fullAnswer, conversationId, messageId) => void
 * @param {Function} onError - (error: Error) => void
 */
function parseSSEStream(stream, onMessage, onComplete, onError) {
  let fullAnswer = '';
  let conversationId = '';
  let messageId = '';
  let buffer = '';

  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;

      if (trimmed.startsWith('data:')) {
        const dataStr = trimmed.substring(5).trim();
        if (!dataStr || dataStr === '[DONE]') continue;

        try {
          const data = JSON.parse(dataStr);
          const event = data.event;

          switch (event) {
            case 'message':
              // 消息片段
              if (data.answer) {
                fullAnswer += data.answer;
                onMessage(data.answer);
              }
              if (data.conversation_id) conversationId = data.conversation_id;
              if (data.id) messageId = data.id;
              break;

            case 'message_end':
              // 消息结束
              if (data.answer) fullAnswer += data.answer;
              if (data.conversation_id) conversationId = data.conversation_id;
              if (data.id) messageId = data.id;
              onComplete(fullAnswer, conversationId, messageId);
              break;

            case 'message_failed':
              onError(new Error(data.message || 'AI 服务返回错误'));
              break;

            case 'message_start':
              if (data.conversation_id) conversationId = data.conversation_id;
              if (data.id) messageId = data.id;
              break;

            case 'message_replace':
              fullAnswer = data.answer || '';
              break;

            // 其他事件（agent_thought, knowledge_retrieve 等）忽略
            default:
              break;
          }
        } catch (parseError) {
          console.warn('[HiAgent] SSE 数据解析失败:', dataStr.substring(0, 100));
        }
      }
    }
  });

  stream.on('end', () => {
    // 流结束，处理剩余 buffer
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith('data:')) {
        try {
          const data = JSON.parse(trimmed.substring(5).trim());
          if (data.answer) fullAnswer += data.answer;
          if (data.conversation_id) conversationId = data.conversation_id;
          if (data.id) messageId = data.id;
        } catch (e) { /* ignore */ }
      }
    }
    onComplete(fullAnswer, conversationId, messageId);
  });

  stream.on('error', (error) => {
    console.error('[HiAgent] SSE 流错误:', error.message);
    onError(error);
  });
}

module.exports = {
  createConversation,
  sendMessage,
  sendMessageStream,
  parseSSEStream,
};
