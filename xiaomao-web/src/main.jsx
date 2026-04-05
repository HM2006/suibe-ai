/* ========================================
   小贸 - 校园AI助手 入口文件
   引入全局样式和路由
   ======================================== */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import './index.css'
import 'katex/dist/katex.min.css'
import App from './App.jsx'

/* 原生平台特定初始化 */
if (Capacitor.isNativePlatform()) {
  // 原生平台特定初始化
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
