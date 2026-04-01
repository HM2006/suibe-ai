/**
 * HiAgent API 服务层
 * 封装与HiAgent API的通信逻辑，包括CSRF token获取、消息发送、流式响应等
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// 从环境变量读取配置
const API_BASE = process.env.HIAGENT_API_BASE || 'https://agent.suibe.edu.cn/api/proxy';
const API_KEY = process.env.HIAGENT_API_KEY || '';

// 最大重试次数
const MAX_RETRIES = 3;
// 重试间隔（毫秒）
const RETRY_DELAY = 1000;

/**
 * 创建axios实例，配置基础设置
 */
const httpClient = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 请求超时60秒
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  },
  // 不自动处理cookie，由我们手动管理
  withCredentials: true
});

/**
 * CSRF token缓存
 * 存储当前有效的CSRF token和对应的cookie
 */
let csrfCache = {
  token: null,
  cookie: null,
  expiresAt: 0 // token过期时间戳
};

/**
 * 获取CSRF token
 * 通过GET请求API基地址，从响应的set-cookie头中提取_csrf token
 * @param {number} [retryCount=0] - 当前重试次数
 * @returns {Promise<{token: string, cookie: string}>} CSRF token和对应的cookie
 */
async function getCsrfToken(retryCount = 0) {
  try {
    // 检查缓存是否有效（缓存5分钟）
    if (csrfCache.token && csrfCache.cookie && Date.now() < csrfCache.expiresAt) {
      return { token: csrfCache.token, cookie: csrfCache.cookie };
    }

    console.log('[HiAgent] 正在获取CSRF token...');

    // 发送GET请求获取CSRF token
    const response = await httpClient.get('/', {
      // 需要接收set-cookie头
      headers: {
        'Accept': 'application/json'
      }
    });

    // 从响应头中提取CSRF token
    const setCookieHeader = response.headers['set-cookie'];
    let csrfToken = null;
    let cookieStr = '';

    if (setCookieHeader && Array.isArray(setCookieHeader)) {
      // 解析set-cookie，提取_csrf token
      for (const cookie of setCookieHeader) {
        cookieStr += `${cookie.split(';')[0]}; `;
        if (cookie.includes('_csrf=')) {
          csrfToken = cookie.split('_csrf=')[1].split(';')[0];
        }
      }
    }

    // 如果从set-cookie中未获取到，尝试从响应体中获取
    if (!csrfToken && response.data && response.data.csrfToken) {
      csrfToken = response.data.csrfToken;
    }

    // 如果从响应体中也没有，尝试从x-csrf-token头获取
    if (!csrfToken && response.headers['x-csrf-token']) {
      csrfToken = response.headers['x-csrf-token'];
    }

    if (!csrfToken) {
      throw new Error('无法获取CSRF token，请检查API服务是否可用');
    }

    // 更新缓存
    csrfCache = {
      token: csrfToken,
      cookie: cookieStr.trim(),
      expiresAt: Date.now() + 5 * 60 * 1000 // 缓存5分钟
    };

    console.log('[HiAgent] CSRF token获取成功');
    return { token: csrfToken, cookie: cookieStr.trim() };

  } catch (error) {
    // 重试逻辑
    if (retryCount < MAX_RETRIES) {
      console.warn(`[HiAgent] 获取CSRF token失败，${RETRY_DELAY}ms后重试 (${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return getCsrfToken(retryCount + 1);
    }

    console.error('[HiAgent] 获取CSRF token失败:', error.message);
    throw new Error(`获取CSRF token失败: ${error.message}`);
  }
}

/**
 * 使CSRF缓存失效
 * 在请求失败时调用，强制下次重新获取
 */
function invalidateCsrfCache() {
  csrfCache = { token: null, cookie: null, expiresAt: 0 };
}

/**
 * 发送消息到HiAgent API（非流式）
 * @param {string} query - 用户消息内容
 * @param {string} [conversationId] - 会话ID（可选）
 * @param {string} [user='default-user'] - 用户标识
 * @param {number} [retryCount=0] - 当前重试次数
 * @returns {Promise<{answer: string, conversation_id: string, message_id: string}>} API响应
 */
async function sendMessage(query, conversationId, user = 'default-user', retryCount = 0) {
  try {
    // 获取CSRF token
    const { token, cookie } = await getCsrfToken();

    // 构建Dify格式的请求体
    const requestBody = {
      inputs: {},
      query: query,
      response_mode: 'blocking',
      conversation_id: conversationId || '',
      user: user
    };

    console.log(`[HiAgent] 发送消息: "${query.substring(0, 50)}..."`);

    // 发送POST请求
    const response = await httpClient.post('/chat-messages', requestBody, {
      headers: {
        'Cookie': cookie,
        'X-CSRF-Token': token
      }
    });

    // 解析响应
    const data = response.data;
    return {
      answer: data.answer || data.message || '暂无回复',
      conversation_id: data.conversation_id || '',
      message_id: data.message_id || uuidv4()
    };

  } catch (error) {
    // 如果是403错误，可能是CSRF token失效，清除缓存后重试
    if (error.response && error.response.status === 403 && retryCount < MAX_RETRIES) {
      console.warn('[HiAgent] CSRF token可能已失效，重新获取...');
      invalidateCsrfCache();
      return sendMessage(query, conversationId, user, retryCount + 1);
    }

    // 其他错误的重试逻辑
    if (retryCount < MAX_RETRIES && (!error.response || error.response.status >= 500)) {
      console.warn(`[HiAgent] 请求失败，${RETRY_DELAY}ms后重试 (${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return sendMessage(query, conversationId, user, retryCount + 1);
    }

    // 所有重试都失败，抛出错误
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    console.error(`[HiAgent] 发送消息失败: [${status}] ${message}`);
    throw new Error(`AI服务请求失败: ${message}`);
  }
}

/**
 * 流式发送消息到HiAgent API（SSE）
 * 返回一个可读流，逐步输出AI回复内容
 * @param {string} query - 用户消息内容
 * @param {string} [conversationId] - 会话ID（可选）
 * @param {string} [user='default-user'] - 用户标识
 * @returns {Promise<import('axios').AxiosResponse>} axios响应对象（用于流式读取）
 */
async function sendMessageStream(query, conversationId, user = 'default-user') {
  // 获取CSRF token
  const { token, cookie } = await getCsrfToken();

  // 构建Dify格式的请求体
  const requestBody = {
    inputs: {},
    query: query,
    response_mode: 'streaming',
    conversation_id: conversationId || '',
    user: user
  };

  console.log(`[HiAgent] 发送流式消息: "${query.substring(0, 50)}..."`);

  // 发送POST请求，设置responseType为stream以接收流式响应
  const response = await httpClient.post('/chat-messages', requestBody, {
    headers: {
      'Cookie': cookie,
      'X-CSRF-Token': token,
      'Accept': 'text/event-stream'
    },
    responseType: 'stream'
  });

  return response;
}

/**
 * 解析SSE事件流
 * 将Dify的SSE事件流转换为统一格式的事件
 * @param {import('stream').Readable} stream - 可读流
 * @param {Function} onMessage - 收到消息片段时的回调 (text: string) => void
 * @param {Function} onComplete - 流式响应完成时的回调 (fullAnswer: string, conversationId: string, messageId: string) => void
 * @param {Function} onError - 出错时的回调 (error: Error) => void
 */
function parseSSEStream(stream, onMessage, onComplete, onError) {
  let fullAnswer = '';
  let conversationId = '';
  let messageId = '';
  let buffer = '';

  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    // 按行分割处理SSE数据
    const lines = buffer.split('\n');
    // 保留最后一行（可能不完整）
    buffer = lines.pop() || '';

    for (const line of lines) {
      // 忽略空行和注释行
      if (!line.trim() || line.startsWith(':')) continue;

      // 解析SSE事件
      if (line.startsWith('data:')) {
        const dataStr = line.substring(5).trim();

        // 检查是否是结束标记
        if (dataStr === '[DONE]') {
          onComplete(fullAnswer, conversationId, messageId);
          return;
        }

        try {
          const data = JSON.parse(dataStr);

          // 根据Dify SSE事件类型处理
          switch (data.event) {
            case 'message':
            case 'agent_message':
              // 消息内容片段
              if (data.answer) {
                fullAnswer += data.answer;
                onMessage(data.answer);
              }
              if (data.conversation_id) {
                conversationId = data.conversation_id;
              }
              if (data.message_id) {
                messageId = data.message_id;
              }
              break;

            case 'message_end':
              // 消息结束事件
              if (data.conversation_id) {
                conversationId = data.conversation_id;
              }
              if (data.message_id) {
                messageId = data.message_id;
              }
              onComplete(fullAnswer, conversationId, messageId);
              break;

            case 'error':
              // 错误事件
              onError(new Error(data.message || 'AI服务返回错误'));
              break;

            case 'message_replace':
              // 消息替换事件（用于替换之前的内容）
              fullAnswer = data.answer || '';
              break;

            default:
              // 其他事件类型，忽略或记录
              break;
          }
        } catch (parseError) {
          // JSON解析失败，可能是不完整的数据，等待下一次data事件
          console.warn('[HiAgent] SSE数据解析失败:', dataStr);
        }
      }
    }
  });

  stream.on('end', () => {
    // 流结束时，如果还有未处理的数据
    if (buffer.trim() && buffer.trim() !== '[DONE]') {
      try {
        const data = JSON.parse(buffer.trim());
        if (data.answer) {
          fullAnswer += data.answer;
          onMessage(data.answer);
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
    onComplete(fullAnswer, conversationId, messageId);
  });

  stream.on('error', (error) => {
    console.error('[HiAgent] SSE流错误:', error.message);
    onError(error);
  });
}

module.exports = {
  getCsrfToken,
  invalidateCsrfCache,
  sendMessage,
  sendMessageStream,
  parseSSEStream
};
