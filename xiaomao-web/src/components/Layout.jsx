/* ========================================
   小贸 - 布局组件
   包含左侧导航栏（桌面端）和底部导航栏（移动端）
   ======================================== */
import { NavLink, useLocation, Link } from 'react-router-dom'
import {
  MessageSquare,
  Map,
  Calendar,
  BarChart3,
  Newspaper,
  Sparkles,
  User as UserIcon,
  FileText,
} from 'lucide-react'
import { useUser } from '../contexts/UserContext'

/* 底部导航菜单配置（移动端6个核心项目） */
const navItems = [
  { path: '/chat', label: 'AI对话', icon: MessageSquare },
  { path: '/campus/map', label: '导航', icon: Map },
  { path: '/campus/schedule', label: '课表', icon: Calendar },
  { path: '/campus/grades', label: '成绩', icon: BarChart3 },
  { path: '/notes', label: '随记', icon: FileText },
  { path: '/campus/news', label: '资讯', icon: Newspaper },
]

/* 根据当前路径获取页面标题 */
function getPageTitle(pathname) {
  const titleMap = {
    '/chat': { title: 'AI对话', subtitle: '' },
    '/campus': { title: '校园服务', subtitle: '' },
    '/campus/map': { title: '校园导航', subtitle: '' },
    '/campus/schedule': { title: '课表查询', subtitle: '' },
    '/campus/grades': { title: '成绩查询', subtitle: '' },
    '/campus/library': { title: '图书馆', subtitle: '' },
    '/campus/news': { title: '校园资讯', subtitle: '' },
    '/notes': { title: '随记', subtitle: '' },
    '/mooc': { title: 'MOOC助手', subtitle: '' },
    '/scholarship': { title: '奖学金计算器', subtitle: '' },
  }
  return titleMap[pathname] || { title: '小贸', subtitle: '' }
}

function Layout({ children }) {
  const location = useLocation()
  const { title } = getPageTitle(location.pathname)
  const { user } = useUser()

  return (
    <div className="app-container">
      {/* 桌面端左侧导航栏 */}
      <aside className="sidebar">
        {/* Logo区域 */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="sidebar-title">小贸 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '4px' }}>v1.3.0</span></div>
            <div className="sidebar-subtitle">校园AI助手</div>
          </div>
        </div>

        {/* 导航列表 */}
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.path} className="nav-item">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
              >
                <item.icon className="nav-icon" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>

      {/* 主内容区域 */}
      <main className="main-content">
        {/* 顶部标题栏 */}
        <header className="top-header">
          <div style={{ flex: 1 }}>
            {/* 移除重复标题，由各页面组件自行显示 */}
          </div>
          {/* 用户入口 - 右上角 */}
          <Link to="/user" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', color: 'var(--text-secondary)' }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 600,
                }}>
                  {(user.nickname || user.username)[0].toUpperCase()}
                </div>
                <span style={{ fontSize: '13px' }}>{user.nickname || user.username}</span>
              </div>
            ) : (
              <UserIcon size={20} />
            )}
          </Link>
        </header>

        {/* 页面内容 */}
        <div className="page-content">
          {children}
        </div>
      </main>

      {/* 移动端底部导航栏 */}
      <nav className="bottom-nav">
        <ul className="bottom-nav-list">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `bottom-nav-link ${isActive ? 'active' : ''}`
                }
              >
                <item.icon className="nav-icon" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export default Layout
