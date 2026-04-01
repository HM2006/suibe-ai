/* ========================================
   小贸 - 管理后台页面
   用户管理 + 用户统计
   仅admin角色可访问
   ======================================== */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import { Shield, Users, BarChart3, ArrowLeft, RefreshCw, Calendar, BookOpen } from 'lucide-react'

/* API基础路径 */
const API_BASE = '/api/admin'

/**
 * 格式化日期时间
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

/**
 * 用户统计面板
 */
function UserStatsPanel({ userId, onBack }) {
  const { token } = useUser()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`${API_BASE}/users/${userId}/stats`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.success && data.data) {
          setStats(data.data)
        } else {
          setError(data.message || '获取统计失败')
        }
      } catch (err) {
        setError('网络错误，请稍后重试')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [userId, token])

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          cursor: 'pointer',
          marginBottom: '16px',
          padding: '4px 0',
        }}
      >
        <ArrowLeft size={16} />
        返回用户列表
      </button>

      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text-primary)' }}>
        用户数据统计
      </h3>

      {loading && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
          加载中...
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#FEF2F2',
          color: '#991B1B',
          borderRadius: '8px',
          fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {stats && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* 课表缓存 */}
          <div style={{
            padding: '16px',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Calendar size={16} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>课表缓存</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              <div>缓存状态：{stats.scheduleCached ? '已缓存' : '未缓存'}</div>
              {stats.scheduleCachedAt && (
                <div>缓存时间：{formatDateTime(stats.scheduleCachedAt)}</div>
              )}
              {stats.scheduleCourseCount !== undefined && (
                <div>课程数量：{stats.scheduleCourseCount} 门</div>
              )}
            </div>
          </div>

          {/* 成绩缓存 */}
          <div style={{
            padding: '16px',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <BookOpen size={16} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>成绩缓存</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              <div>缓存状态：{stats.gradesCached ? '已缓存' : '未缓存'}</div>
              {stats.gradesCachedAt && (
                <div>缓存时间：{formatDateTime(stats.gradesCachedAt)}</div>
              )}
              {stats.gradesCount !== undefined && (
                <div>成绩记录：{stats.gradesCount} 条</div>
              )}
              {stats.gradesGPA !== undefined && (
                <div>GPA：{stats.gradesGPA}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 管理后台主页面
 */
function AdminPage() {
  const { user, token } = useUser()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(null)

  /* 权限检查：非admin角色重定向 */
  if (!user || user.role !== 'admin') {
    return (
      <div style={{
        maxWidth: '400px',
        margin: '0 auto',
        padding: '40px 20px',
        textAlign: 'center',
      }}>
        <Shield size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>无权访问</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          管理后台仅限管理员访问
        </p>
        <button
          onClick={() => navigate('/chat')}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            border: '1px solid var(--card-border)',
            background: 'var(--card-bg)',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          返回首页
        </button>
      </div>
    )
  }

  /* 获取用户列表 */
  const fetchUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success && data.data) {
        setUsers(Array.isArray(data.data) ? data.data : data.data.users || [])
      } else {
        setError(data.message || '获取用户列表失败')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  /* 首次加载获取用户列表 */
  useEffect(() => {
    fetchUsers()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* 查看用户统计 */
  if (selectedUserId) {
    return (
      <div className="admin-page" style={{ padding: '24px' }}>
        <UserStatsPanel
          userId={selectedUserId}
          onBack={() => setSelectedUserId(null)}
        />
      </div>
    )
  }

  return (
    <div className="admin-page" style={{ padding: '24px' }}>
      {/* 页面标题 */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">管理后台</h1>
          <p className="page-desc">用户管理与数据统计</p>
        </div>
        <button
          className="refresh-btn"
          onClick={fetchUsers}
          disabled={loading}
        >
          <RefreshCw size={12} />
          刷新
        </button>
      </div>

      {/* 加载中 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
          加载中...
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#FEF2F2',
          color: '#991B1B',
          borderRadius: '8px',
          fontSize: '13px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {/* 用户列表表格 */}
      {!loading && !error && (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}>
          {users.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: 'var(--text-muted)',
              fontSize: '14px',
            }}>
              暂无用户数据
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-user-table">
                <thead>
                  <tr>
                    <th>用户名</th>
                    <th>昵称</th>
                    <th>角色</th>
                    <th>注册时间</th>
                    <th>最后登录</th>
                    <th>教务连接</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id || u._id}>
                      <td style={{ fontWeight: 500 }}>{u.username}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{u.nickname || '-'}</td>
                      <td>
                        <span className={`admin-badge ${u.role === 'admin' ? 'admin' : 'user'}`}>
                          {u.role === 'admin' ? '管理员' : '用户'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {formatDateTime(u.createdAt || u.registeredAt)}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {formatDateTime(u.lastLoginAt || u.updatedAt)}
                      </td>
                      <td>
                        <span className={`admin-badge ${u.eduConnected ? 'connected' : 'user'}`}>
                          {u.eduConnected ? '已连接' : '未连接'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => setSelectedUserId(u.id || u._id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--card-border)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          统计
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminPage
