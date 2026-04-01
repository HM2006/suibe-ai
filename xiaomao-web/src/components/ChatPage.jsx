/* ========================================
   小贸 - AI对话页面（核心页面）
   支持Markdown渲染、流式响应、快捷功能
   ======================================== */
import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Send,
  Map,
  Calendar,
  BarChart3,
  BookOpen,
  Newspaper,
  Sparkles,
  GraduationCap,
  Utensils,
  Clock,
} from 'lucide-react'

/* 快捷功能按钮配置 */
const quickActions = [
  { label: '校园导航', icon: Map, message: '帮我导航到图书馆' },
  { label: '查课表', icon: Calendar, message: '帮我查看今天的课表' },
  { label: '查成绩', icon: BarChart3, message: '帮我查询本学期成绩' },
  { label: '图书馆', icon: BookOpen, message: '帮我查一下图书馆的借阅情况' },
  { label: '校园资讯', icon: Newspaper, message: '最近有什么校园新闻？' },
  { label: '食堂推荐', icon: Utensils, message: '今天食堂有什么好吃的推荐？' },
]

/* 欢迎消息 */
const welcomeMessage = `你好！我是**小贸**，你的校园AI助手 🎓

我可以帮你：
- 🗺️ **校园导航** - 快速找到教学楼、食堂、图书馆等地点
- 📅 **课表查询** - 查看每天的课程安排
- 📊 **成绩查询** - 查询各科成绩和GPA
- 📚 **图书馆** - 查询借阅情况和搜索图书
- 📰 **校园资讯** - 获取最新校园动态
- 🍜 **生活助手** - 食堂推荐、天气查询等

有什么我可以帮你的吗？`

function ChatPage() {
  /* 消息列表状态 */
  const [messages, setMessages] = useState([])
  /* 输入框内容 */
  const [inputValue, setInputValue] = useState('')
  /* 是否正在加载AI回复 */
  const [isLoading, setIsLoading] = useState(false)
  /* 消息列表引用，用于自动滚动 */
  const messagesEndRef = useRef(null)
  /* 输入框引用 */
  const inputRef = useRef(null)

  /* 自动滚动到底部 */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  /* 发送消息 */
  const handleSend = async (text) => {
    const messageText = text || inputValue.trim()
    if (!messageText || isLoading) return

    /* 清空输入框 */
    setInputValue('')
    if (inputRef.current) {
      inputRef.current.style.height = '44px'
    }

    /* 添加用户消息 */
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageText,
    }
    setMessages((prev) => [...prev, userMessage])

    /* 开始加载AI回复 */
    setIsLoading(true)

    try {
      /* 创建AI消息占位 */
      const aiMessageId = Date.now() + 1
      setMessages((prev) => [
        ...prev,
        { id: aiMessageId, role: 'assistant', content: '' },
      ])

      /* 调用后端API */
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: messageText }],
          conversation_id: null,
        }),
      })

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`)
      }

      /* 检查是否为SSE流式响应 */
      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream')) {
        /* SSE流式响应处理 */
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullContent = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          /* 解析SSE数据 */
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data)
                const content = parsed.content || parsed.delta || ''
                fullContent += content
                /* 逐步更新AI消息内容 */
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? { ...msg, content: fullContent }
                      : msg
                  )
                )
              } catch {
                /* 如果不是JSON，直接作为文本内容 */
                fullContent += data
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? { ...msg, content: fullContent }
                      : msg
                  )
                )
              }
            }
          }
        }
      } else {
        /* 普通JSON响应 */
        const data = await response.json()
        const aiContent = data.data?.answer || data.answer || data.reply || '抱歉，我暂时无法理解你的问题。'
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, content: aiContent }
              : msg
          )
        )
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      /* 移除空的AI消息，添加错误提示 */
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.content !== '')
        return [
          ...filtered,
          {
            id: Date.now() + 1,
            role: 'assistant',
            content: '抱歉，连接出现了问题。请检查网络连接或稍后再试。\n\n如果后端服务未启动，请先运行 `npm run dev` 启动后端服务。',
          },
        ]
      })
    } finally {
      setIsLoading(false)
    }
  }

  /* 处理键盘事件（Enter发送，Shift+Enter换行） */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /* 自动调整输入框高度 */
  const handleInputChange = (e) => {
    setInputValue(e.target.value)
    const textarea = e.target
    textarea.style.height = '44px'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  /* 点击快捷功能按钮 */
  const handleQuickAction = (action) => {
    handleSend(action.message)
  }

  return (
    <div className="chat-container">
      {/* 消息列表 */}
      <div className="chat-messages">
        {/* 欢迎消息（无历史消息时显示） */}
        {messages.length === 0 && (
          <div className="welcome-section">
            <div className="welcome-avatar">
              <Sparkles size={36} />
            </div>
            <h2 className="welcome-title">你好，我是小贸</h2>
            <p className="welcome-desc">你的校园AI助手，随时为你解答问题</p>

            {/* 快捷功能按钮 */}
            <div className="quick-actions">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  className="quick-action-btn"
                  onClick={() => handleQuickAction(action)}
                >
                  <action.icon className="btn-icon" />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>

            {/* 欢迎消息内容 */}
            <div className="message assistant" style={{ alignSelf: 'center', maxWidth: '600px', marginTop: '24px' }}>
              <div className="message-avatar">
                <Sparkles size={16} />
              </div>
              <div className="message-bubble">
                <div className="markdown-content">
                  <ReactMarkdown>{welcomeMessage}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 历史消息列表 */}
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            {/* 头像 */}
            <div className="message-avatar">
              {message.role === 'user' ? (
                <GraduationCap size={16} />
              ) : (
                <Sparkles size={16} />
              )}
            </div>
            {/* 消息气泡 */}
            <div className="message-bubble">
              {message.content ? (
                <div className="markdown-content">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              ) : (
                /* 加载中的打字指示器 */
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 滚动锚点 */}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题..."
            rows={1}
            disabled={isLoading}
          />
        </div>
        <button
          className="send-btn"
          onClick={() => handleSend()}
          disabled={!inputValue.trim() || isLoading}
          title="发送消息"
        >
          <Send className="btn-icon" />
        </button>
      </div>
    </div>
  )
}

export default ChatPage
