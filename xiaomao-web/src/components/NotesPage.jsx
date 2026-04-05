/* ========================================
   小贸 - 随记页面（移动端原生风格）
   ======================================== */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, X, Save, Trash2, FileText, Paperclip,
  Sparkles, Loader, ChevronLeft, ChevronDown, ChevronUp,
  Download, AlertCircle, Camera, FileUp, Copy,
  Filter, Check, Search
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { useUser } from '../contexts/UserContext'

const API_BASE = 'https://api.mmxiong.xyz/api/notes'
const MAX_FILE_SIZE = 10 * 1024 * 1024

/* ========== 工具函数 ========== */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 172800000) return '昨天'
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function isImage(mimetype) {
  if (!mimetype) return false
  const imgTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml']
  return imgTypes.includes(mimetype.toLowerCase()) || mimetype.startsWith('image/')
}

function getFileExt(filename) {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop().toUpperCase() : '?'
}

function getFileColor(ext) {
  if (['PDF'].includes(ext)) return '#EF4444'
  if (['DOC', 'DOCX'].includes(ext)) return '#3B82F6'
  if (['PPT', 'PPTX'].includes(ext)) return '#F97316'
  if (['XLS', 'XLSX'].includes(ext)) return '#22C55E'
  if (['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP', 'SVG', 'BMP'].includes(ext)) return '#8B5CF6'
  return '#6B7280'
}

/* ========== 骨架屏 ========== */
function SkeletonLoader() {
  return (
    <div style={{ padding: '16px 18px' }}>
      <div className="skeleton-bar" />
      <div className="skeleton-bar" />
      <div className="skeleton-bar" />
    </div>
  )
}

/* ========== Toast 提示 ========== */
function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div style={{
      position: 'fixed', top: 'calc(80px + env(safe-area-inset-top, 0px))', left: '50%', transform: 'translateX(-50%)',
      padding: '10px 24px', borderRadius: '20px',
      background: '#059669', color: '#fff', fontSize: '14px', fontWeight: 500,
      boxShadow: '0 4px 12px rgba(5,150,105,0.3)', zIndex: 200,
      animation: 'fadeIn 0.2s ease',
    }}>
      ✓ {message}
    </div>
  )
}

/* ========== 便签卡片（列表项） ========== */
function NoteCard({ note, onClick }) {
  return (
    <div className="note-card-native" onClick={onClick}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {note.title || '无标题'}
          </span>
          {note.course_name && (
            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(79,70,229,0.1)', color: '#4F46E5', flexShrink: 0, maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {note.course_name}
            </span>
          )}
          {note.ai_summary && <Sparkles size={12} style={{ color: '#F59E0B', flexShrink: 0 }} />}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {note.content || '暂无内容'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>{formatDate(note.updated_at)}</span>
          {note.attachment_count > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><Paperclip size={10} /> {note.attachment_count}</span>}
        </div>
      </div>
      <ChevronLeft size={16} style={{ color: 'var(--text-muted)', transform: 'rotate(180deg)', flexShrink: 0, marginLeft: '8px' }} />
    </div>
  )
}

/* ========== 随记编辑器 ========== */
function NoteEditor({ initialNote, courses, token, onSave, onDelete, onBack }) {
  /* 状态 */
  const [noteId, setNoteId] = useState(initialNote?.id || null)
  const [title, setTitle] = useState(initialNote?.title || '')
  const [courseName, setCourseName] = useState(initialNote?.course_name || '')
  const [content, setContent] = useState(initialNote?.content || '')
  const [aiSummary, setAiSummary] = useState(initialNote?.ai_summary || '')
  const [attachments, setAttachments] = useState(initialNote?.attachments || [])
  const [isSaving, setIsSaving] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [showAiSummary, setShowAiSummary] = useState(!!initialNote?.ai_summary)
  const [aiCollapsed, setAiCollapsed] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [isLoadingNote, setIsLoadingNote] = useState(!!initialNote?.id)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  /* visualViewport 键盘适配 */
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)

  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)

  /* 跟踪未保存的修改 */
  const markChanged = useCallback(() => setHasUnsavedChanges(true), [])
  const handleTitleChange = (e) => { setTitle(e.target.value); markChanged() }
  const handleCourseChange = (e) => { setCourseName(e.target.value); markChanged() }
  const handleContentChange = (e) => { setContent(e.target.value); markChanged() }

  /* 监听 visualViewport */
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => {
      const diff = window.innerHeight - vv.height
      if (diff > 100) { setKeyboardHeight(diff); setIsKeyboardOpen(true) }
      else { setKeyboardHeight(0); setIsKeyboardOpen(false) }
    }
    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', onResize)
    return () => { vv.removeEventListener('resize', onResize); vv.removeEventListener('scroll', onResize) }
  }, [])

  /* 加载完整随记数据 */
  useEffect(() => {
    if (!initialNote?.id || !token) return
    const loadFullNote = async () => {
      try {
        const res = await fetch(`${API_BASE}/${initialNote.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
        const data = await res.json()
        if (data.success) {
          const n = data.data
          setAttachments(n.attachments || [])
          setContent(n.content || '')
          setAiSummary(n.ai_summary || '')
          setShowAiSummary(!!n.ai_summary)
        }
      } catch (err) { console.warn('加载随记详情失败:', err) }
      finally { setIsLoadingNote(false) }
    }
    loadFullNote()
  }, [initialNote?.id, token])

  /* 通用保存 */
  const doSave = useCallback(async (t, cn, c, aiS) => {
    if (!token) return null
    let savedNote
    if (noteId) {
      const res = await fetch(`${API_BASE}/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: t, course_name: cn, content: c, ai_summary: aiS }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || '保存失败')
      savedNote = data.data
    } else {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: t, course_name: cn, content: c }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.message || '创建失败')
      savedNote = data.data
      setNoteId(savedNote.id)
    }
    return savedNote
  }, [token, noteId])

  /* 上传新附件 */
  const uploadNewAttachments = useCallback(async (nid, atts) => {
    const newAtts = atts.filter(a => a.isNew)
    if (newAtts.length === 0) return
    const filesData = newAtts.map(a => ({ filename: a.filename, mimetype: a.mimetype, data: a.data }))
    await fetch(`${API_BASE}/${nid}/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ files: filesData }),
    })
    setAttachments(prev => prev.map(a => a.isNew ? { ...a, isNew: false } : a))
  }, [token])

  /* 保存按钮 */
  const handleSave = async () => {
    if (!token) return
    setIsSaving(true); setError('')
    try {
      const savedNote = await doSave(title.trim(), courseName, content, aiSummary)
      await uploadNewAttachments(savedNote.id, attachments)
      setHasUnsavedChanges(false)
      setToast('保存成功')
    } catch (err) { setError(err.message || '保存失败') }
    finally { setIsSaving(false) }
  }

  /* 添加文件 */
  const handleAddFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) { setError(`"${file.name}" 超过10MB限制`); return }
      try {
        const data = await fileToBase64(file)
        setAttachments(prev => [...prev, {
          id: `new_${Date.now()}_${Math.random()}`,
          filename: file.name, mimetype: file.type, size: file.size, data, isNew: true,
        }])
        markChanged()
      } catch { setError(`读取 "${file.name}" 失败`) }
    }
    e.target.value = ''
  }

  /* 删除附件 */
  const handleRemoveAttachment = async (att) => {
    if (att.isNew) { setAttachments(prev => prev.filter(a => a.id !== att.id)); markChanged(); return }
    try {
      await fetch(`${API_BASE}/${noteId}/attachments/${att.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      setAttachments(prev => prev.filter(a => a.id !== att.id))
    } catch { setError('删除附件失败') }
  }

  /* AI速览 */
  const handleSummarize = async () => {
    if (!token) return
    setIsSummarizing(true); setShowAiSummary(true); setAiCollapsed(false); setError('')
    try {
      const savedNote = await doSave(title.trim() || '未命名随记', courseName, content, aiSummary)
      await uploadNewAttachments(savedNote.id, attachments)
      const res = await fetch(`${API_BASE}/${savedNote.id}/summarize`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
      const summary = data.data.summary
      setAiSummary(summary)
      await fetch(`${API_BASE}/${savedNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ai_summary: summary }),
      })
    } catch (err) { setError(err.message || 'AI速览失败') }
    finally { setIsSummarizing(false) }
  }

  /* 下载附件 */
  const handleDownload = async (att) => {
    try {
      const res = await fetch(`${API_BASE}/${noteId}/attachments/${att.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      if (!data.success) { setError('下载失败：文件不存在'); return }

      const fileData = data.data
      const base64Data = fileData.data
      const mimeType = att.mimetype || fileData.mimetype || 'application/octet-stream'
      const filename = att.filename || 'download'

      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: mimeType })

      if (window.AndroidBridge && typeof window.AndroidBridge.downloadFile === 'function') {
        const reader = new FileReader()
        reader.onload = () => { window.AndroidBridge.downloadFile(filename, reader.result) }
        reader.readAsDataURL(blob)
        return
      }

      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
    } catch (err) {
      console.error('下载失败:', err)
      setError('下载失败，请重试')
    }
  }

  /* 返回 */
  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (confirm('有未保存的修改，确定要退出吗？')) onBack()
    } else {
      onBack()
    }
  }

  /* 复制AI总结 */
  const handleCopySummary = () => { navigator.clipboard.writeText(aiSummary).catch(() => {}) }

  return (
    <div className="note-editor-native">
      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}

      {/* 顶部导航栏 - Material Design 风格 */}
      <div className="note-editor-header">
        <button className="note-editor-back-btn" onClick={handleBack}>
          <ChevronLeft size={22} />
          <span>返回</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {noteId && (
            <button className="note-editor-action-btn note-editor-delete-btn" onClick={onDelete}>
              <Trash2 size={14} />
              <span>删除</span>
            </button>
          )}
          <button className="note-editor-save-btn" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader size={14} className="spin-icon" /> : <Save size={14} />}
            <span>保存</span>
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="note-error-bar">
          <AlertCircle size={12} /> {error}
          <span className="note-error-close" onClick={() => setError('')}><X size={12} /></span>
        </div>
      )}

      {/* 可滚动编辑区域 */}
      <div className="note-editor-scroll" style={{
        paddingBottom: isKeyboardOpen ? `${keyboardHeight + 56}px` : 'calc(56px + var(--safe-area-bottom, 0px))',
      }}>
        <div className="note-editor-body">

          {/* AI速览区域 */}
          {showAiSummary && (
            <div className="note-ai-panel">
              <div className="note-ai-panel-header" onClick={() => setAiCollapsed(!aiCollapsed)}>
                <div className="note-ai-panel-title">
                  <Sparkles size={14} /> AI速览
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {aiSummary && !isSummarizing && (
                    <button className="note-ai-copy-btn" onClick={(e) => { e.stopPropagation(); handleCopySummary() }}>
                      <Copy size={14} />
                    </button>
                  )}
                  {aiCollapsed ? <ChevronDown size={14} style={{ color: '#D97706' }} /> : <ChevronUp size={14} style={{ color: '#D97706' }} />}
                </div>
              </div>
              {!aiCollapsed && (
                isSummarizing ? (
                  <SkeletonLoader />
                ) : aiSummary ? (
                  <div className="ai-summary-content" style={{ padding: '14px 16px', fontSize: '13px', lineHeight: '1.8', color: '#92400E' }}>
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{aiSummary}</ReactMarkdown>
                  </div>
                ) : (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: '#D97706', fontSize: '13px' }}>
                    <Sparkles size={20} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
                    点击底部 AI速览 按钮生成总结
                  </div>
                )
              )}
            </div>
          )}

          {/* 标题输入 */}
          <input type="text" value={title} onChange={handleTitleChange} placeholder="标题" className="note-title-input" />

          {/* 课程关联 */}
          {courses.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <select value={courseName} onChange={handleCourseChange} className="note-course-select">
                <option value="">不关联课程</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* 内容输入 */}
          {isLoadingNote ? (
            <div style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader size={18} className="spin-icon" style={{ color: 'var(--text-muted)' }} />
            </div>
          ) : (
            <textarea value={content} onChange={handleContentChange} placeholder="开始记录..." className="note-content-input" />
          )}

          {/* 图片附件 */}
          {attachments.filter(a => isImage(a.mimetype)).map(att => (
            <div key={att.id} className="note-image-attachment">
              <img
                src={att.data ? `data:${att.mimetype};base64,${att.data}` : ''}
                alt={att.filename}
                style={{ maxHeight: '300px', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                onLoad={(e) => { e.target.nextSibling.style.display = 'none'; e.target.style.display = 'block'; }}
              />
              <div style={{ display: 'none', padding: '20px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px', gap: '8px' }}>
                <Camera size={20} /> 图片加载失败
              </div>
              <button className="note-image-remove-btn" onClick={() => handleRemoveAttachment(att)}>
                <X size={12} />
              </button>
            </div>
          ))}

          {/* 非图片附件 */}
          {attachments.filter(a => !isImage(a.mimetype)).map(att => {
            const ext = getFileExt(att.filename)
            const color = getFileColor(ext)
            return (
              <div key={att.id} className="file-card">
                <div className="file-card-icon" style={{ background: color }}>{ext}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.filename}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{formatSize(att.size)}</div>
                </div>
                {!att.isNew && <Download size={16} style={{ cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }} onClick={() => handleDownload(att)} />}
                <X size={16} style={{ cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }} onClick={() => handleRemoveAttachment(att)} />
              </div>
            )
          })}
        </div>
      </div>

      {/* 底部工具栏 - Material Design 风格 */}
      <div className="note-editor-toolbar" style={{
        bottom: isKeyboardOpen ? keyboardHeight : 0,
      }}>
        <button className="note-toolbar-btn" onClick={handleSummarize} disabled={isSummarizing}
          style={{ color: isSummarizing ? 'var(--text-muted)' : '#F59E0B' }}>
          <Sparkles size={20} /><span>AI速览</span>
        </button>
        <button className="note-toolbar-btn" onClick={() => imageInputRef.current?.click()}>
          <Camera size={20} /><span>图片</span>
        </button>
        <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleAddFiles} style={{ display: 'none' }} />
        <button className="note-toolbar-btn" onClick={() => fileInputRef.current?.click()}>
          <FileUp size={20} /><span>文件</span>
        </button>
        <input ref={fileInputRef} type="file" multiple onChange={handleAddFiles} style={{ display: 'none' }} />
      </div>
    </div>
  )
}

/* ========== 随记主页面 ========== */
function NotesPage() {
  const navigate = useNavigate()
  const { user, token } = useUser()
  const [notes, setNotes] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingNote, setEditingNote] = useState(null)
  const [filterCourse, setFilterCourse] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = useCallback(async () => {
    if (!token) { setLoading(false); return }
    setLoading(true)
    try {
      const [notesRes, coursesRes] = await Promise.all([
        fetch(API_BASE, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE}/courses`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ])
      const notesData = await notesRes.json()
      const coursesData = await coursesRes.json()
      if (notesData.success) setNotes(notesData.data)
      if (coursesData.success) setCourses(coursesData.data)
    } catch (err) { console.warn('加载随记失败:', err) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { loadData() }, [loadData])

  /* 筛选 + 搜索后的随记 */
  const filteredNotes = notes.filter(n => {
    const matchCourse = !filterCourse || n.course_name === filterCourse
    const matchSearch = !searchQuery ||
      (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.content || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchCourse && matchSearch
  })

  if (!user) {
    return (
      <div className="notes-empty-state">
        <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
        <p style={{ fontSize: '15px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-secondary)' }}>登录后使用随记功能</p>
        <button className="note-login-btn" onClick={() => navigate('/user')}>前往登录</button>
      </div>
    )
  }

  /* 编辑模式 */
  if (editingNote !== null) {
    return (
      <NoteEditor
        initialNote={editingNote}
        courses={courses} token={token}
        onSave={() => { setEditingNote(null); loadData() }}
        onDelete={async () => {
          const nid = editingNote?.id
          if (!nid) return
          if (!confirm('确定删除这条随记吗？')) return
          try {
            await fetch(`${API_BASE}/${nid}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
            setEditingNote(null); loadData()
          } catch { /* ignore */ }
        }}
        onBack={() => setEditingNote(null)}
      />
    )
  }

  /* 列表模式 */
  return (
    <div className="notes-page-native">
      {/* 顶部操作栏 */}
      <div className="notes-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 筛选按钮 */}
          {courses.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                className={`notes-filter-btn ${showFilter || filterCourse ? 'active' : ''}`}
                onClick={() => setShowFilter(!showFilter)}
              >
                <Filter size={16} />
              </button>
              {showFilter && (
                <div className="notes-filter-dropdown">
                  <div className="notes-filter-item" onClick={() => { setFilterCourse(''); setShowFilter(false) }}
                    style={{ background: filterCourse === '' ? 'rgba(79,70,229,0.1)' : 'transparent', color: filterCourse === '' ? 'var(--primary)' : 'var(--text-secondary)' }}>
                    {filterCourse === '' && <Check size={14} />} 全部随记
                  </div>
                  {courses.map(c => (
                    <div key={c} className="notes-filter-item" onClick={() => { setFilterCourse(c); setShowFilter(false) }}
                      style={{ background: filterCourse === c ? 'rgba(79,70,229,0.1)' : 'transparent', color: filterCourse === c ? 'var(--primary)' : 'var(--text-secondary)' }}>
                      {filterCourse === c && <Check size={14} />} {c}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* 搜索框 */}
          <div className="notes-search-box">
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="搜索随记..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="notes-search-input"
            />
            {searchQuery && (
              <X size={14} style={{ color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }} onClick={() => setSearchQuery('')} />
            )}
          </div>
        </div>
        <button className="notes-add-btn" onClick={() => setEditingNote({})}>
          <Plus size={20} />
        </button>
      </div>

      {/* 筛选提示 */}
      {filterCourse && (
        <div className="notes-filter-tag">
          <Filter size={14} /> 筛选: {filterCourse}
          <span style={{ cursor: 'pointer', marginLeft: 'auto' }} onClick={() => setFilterCourse('')}>
            <X size={14} />
          </span>
        </div>
      )}

      {/* 内容区域 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Loader size={20} className="spin-icon" style={{ display: 'inline-block' }} />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="notes-empty-state">
          <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontSize: '15px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-secondary)' }}>
            {filterCourse || searchQuery ? '没有找到匹配的随记' : '还没有随记'}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {filterCourse || searchQuery ? '尝试其他筛选条件' : '点击右上角 + 创建第一条随记'}
          </p>
        </div>
      ) : (
        <div className="notes-list-native">
          {filteredNotes.map(note => <NoteCard key={note.id} note={note} onClick={() => setEditingNote(note)} />)}
        </div>
      )}
    </div>
  )
}

export default NotesPage
