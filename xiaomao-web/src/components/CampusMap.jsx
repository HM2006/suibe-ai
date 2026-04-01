/* ========================================
   小贸 - 校园导航页面
   SVG简化版校园地图 + POI标记点列表
   ======================================== */
import { useState, useMemo } from 'react'
import {
  Search,
  MapPin,
  Building,
  BookOpen,
  Utensils,
  Home,
  Dumbbell,
  Coffee,
  GraduationCap,
  Trees,
  Bus,
  ShoppingBag,
} from 'lucide-react'

/* 校园POI数据 */
const poiData = [
  {
    id: 1,
    name: '第一教学楼',
    category: '教学楼',
    address: '校园中心区域',
    description: '主要教学楼，设有阶梯教室和多媒体教室',
    icon: Building,
    color: '#4F46E5',
    x: 35,
    y: 30,
  },
  {
    id: 2,
    name: '第二教学楼',
    category: '教学楼',
    address: '校园东区',
    description: '理工科教学楼，配有实验室',
    icon: Building,
    color: '#4F46E5',
    x: 60,
    y: 25,
  },
  {
    id: 3,
    name: '图书馆',
    category: '学习',
    address: '校园中心广场北侧',
    description: '藏书100万册，设有自习室和电子阅览室',
    icon: BookOpen,
    color: '#7C3AED',
    x: 48,
    y: 20,
  },
  {
    id: 4,
    name: '第一食堂',
    category: '餐饮',
    address: '学生公寓区西侧',
    description: '提供早中晚餐，特色窗口：川菜、粤菜',
    icon: Utensils,
    color: '#DC2626',
    x: 20,
    y: 55,
  },
  {
    id: 5,
    name: '第二食堂',
    category: '餐饮',
    address: '教学楼南侧',
    description: '提供早中晚餐，特色窗口：面食、麻辣烫',
    icon: Utensils,
    color: '#DC2626',
    x: 45,
    y: 50,
  },
  {
    id: 6,
    name: '学生公寓1号楼',
    category: '住宿',
    address: '校园西侧',
    description: '本科生宿舍楼，4人间',
    icon: Home,
    color: '#059669',
    x: 15,
    y: 40,
  },
  {
    id: 7,
    name: '体育馆',
    category: '运动',
    address: '校园南侧',
    description: '室内篮球场、羽毛球场、健身房',
    icon: Dumbbell,
    color: '#D97706',
    x: 70,
    y: 60,
  },
  {
    id: 8,
    name: '行政楼',
    category: '办公',
    address: '校园正门北侧',
    description: '教务处、学生处、财务处等行政部门',
    icon: GraduationCap,
    color: '#0891B2',
    x: 50,
    y: 10,
  },
  {
    id: 9,
    name: '校园咖啡厅',
    category: '餐饮',
    address: '图书馆一楼',
    description: '提供咖啡、茶饮和轻食',
    icon: Coffee,
    color: '#92400E',
    x: 52,
    y: 28,
  },
  {
    id: 10,
    name: '校医院',
    category: '服务',
    address: '校园西北角',
    description: '提供基本医疗服务和健康咨询',
    icon: Building,
    color: '#DC2626',
    x: 10,
    y: 20,
  },
  {
    id: 11,
    name: '校园超市',
    category: '服务',
    address: '食堂旁',
    description: '日用品、零食饮料、文具等',
    icon: ShoppingBag,
    color: '#059669',
    x: 25,
    y: 62,
  },
  {
    id: 12,
    name: '校车站',
    category: '交通',
    address: '校园正门',
    description: '往返地铁站和校区的班车',
    icon: Bus,
    color: '#4F46E5',
    x: 50,
    y: 85,
  },
]

function CampusMap() {
  /* 搜索关键词 */
  const [searchText, setSearchText] = useState('')
  /* 选中的POI */
  const [selectedPoi, setSelectedPoi] = useState(null)

  /* 根据搜索关键词过滤POI */
  const filteredPois = useMemo(() => {
    if (!searchText.trim()) return poiData
    const keyword = searchText.trim().toLowerCase()
    return poiData.filter(
      (poi) =>
        poi.name.toLowerCase().includes(keyword) ||
        poi.category.toLowerCase().includes(keyword) ||
        poi.address.toLowerCase().includes(keyword)
    )
  }, [searchText])

  /* 点击POI项 */
  const handlePoiClick = (poi) => {
    setSelectedPoi(selectedPoi?.id === poi.id ? null : poi)
  }

  return (
    <div className="map-container">
      {/* 页面标题 */}
      <div className="page-header">
        <h1 className="page-title">校园导航</h1>
        <p className="page-desc">快速找到校园内的各个地点</p>
      </div>

      {/* 搜索框 */}
      <div className="map-search">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="map-search-input"
            placeholder="搜索教学楼、食堂、图书馆..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>
      </div>

      {/* SVG校园地图 */}
      <div className="map-canvas">
        <svg className="map-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          {/* 背景 */}
          <rect width="100" height="100" fill="#F0FDF4" />

          {/* 校园道路 */}
          <line x1="50" y1="0" x2="50" y2="100" stroke="#D1D5DB" strokeWidth="1.5" strokeDasharray="3,3" />
          <line x1="0" y1="45" x2="100" y2="45" stroke="#D1D5DB" strokeWidth="1.5" strokeDasharray="3,3" />
          <line x1="0" y1="70" x2="100" y2="70" stroke="#D1D5DB" strokeWidth="1.5" strokeDasharray="3,3" />

          {/* 绿化区域 */}
          <ellipse cx="50" cy="38" rx="8" ry="5" fill="#BBF7D0" opacity="0.6" />
          <ellipse cx="30" cy="75" rx="6" ry="4" fill="#BBF7D0" opacity="0.6" />
          <ellipse cx="75" cy="45" rx="5" ry="3" fill="#BBF7D0" opacity="0.6" />

          {/* 建筑物底色 */}
          <rect x="30" y="25" width="12" height="8" rx="1" fill="#E0E7FF" stroke="#4F46E5" strokeWidth="0.3" />
          <rect x="55" y="20" width="12" height="8" rx="1" fill="#E0E7FF" stroke="#4F46E5" strokeWidth="0.3" />
          <rect x="43" y="15" width="12" height="10" rx="1" fill="#EDE9FE" stroke="#7C3AED" strokeWidth="0.3" />
          <rect x="15" y="50" width="12" height="8" rx="1" fill="#FEE2E2" stroke="#DC2626" strokeWidth="0.3" />
          <rect x="40" y="45" width="12" height="8" rx="1" fill="#FEE2E2" stroke="#DC2626" strokeWidth="0.3" />
          <rect x="10" y="35" width="10" height="8" rx="1" fill="#D1FAE5" stroke="#059669" strokeWidth="0.3" />
          <rect x="65" y="55" width="12" height="8" rx="1" fill="#FEF3C7" stroke="#D97706" strokeWidth="0.3" />
          <rect x="45" y="5" width="12" height="8" rx="1" fill="#CFFAFE" stroke="#0891B2" strokeWidth="0.3" />

          {/* POI标记点 */}
          {filteredPois.map((poi) => (
            <g
              key={poi.id}
              onClick={() => handlePoiClick(poi)}
              style={{ cursor: 'pointer' }}
            >
              {/* 选中状态高亮圈 */}
              {selectedPoi?.id === poi.id && (
                <circle
                  cx={poi.x}
                  cy={poi.y}
                  r="4"
                  fill="none"
                  stroke={poi.color}
                  strokeWidth="0.5"
                  opacity="0.5"
                >
                  <animate
                    attributeName="r"
                    from="3"
                    to="6"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.6"
                    to="0"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              {/* 标记点 */}
              <circle
                cx={poi.x}
                cy={poi.y}
                r="2.5"
                fill={poi.color}
                stroke="white"
                strokeWidth="0.8"
              />
              {/* 标签 */}
              <text
                x={poi.x}
                y={poi.y - 4}
                textAnchor="middle"
                fontSize="2.5"
                fontWeight="600"
                fill="#1E293B"
              >
                {poi.name}
              </text>
            </g>
          ))}

          {/* 校门标记 */}
          <rect x="45" y="90" width="10" height="4" rx="1" fill="#4F46E5" opacity="0.3" />
          <text x="50" y="98" textAnchor="middle" fontSize="2.5" fill="#4F46E5" fontWeight="600">
            校门
          </text>
        </svg>
      </div>

      {/* POI列表 */}
      <div className="poi-list">
        {filteredPois.map((poi) => (
          <div
            key={poi.id}
            className={`poi-item ${selectedPoi?.id === poi.id ? 'active' : ''}`}
            onClick={() => handlePoiClick(poi)}
          >
            <div
              className="poi-icon"
              style={{ background: poi.color + '15', color: poi.color }}
            >
              <poi.icon size={18} />
            </div>
            <div className="poi-info">
              <div className="poi-name">{poi.name}</div>
              <div className="poi-address">
                {poi.category} · {poi.address}
              </div>
            </div>
            <MapPin size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
        ))}
      </div>

      {/* 选中POI的详情弹窗 */}
      {selectedPoi && (
        <div
          className="news-modal-overlay"
          onClick={() => setSelectedPoi(null)}
        >
          <div className="news-modal" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div
                className="poi-icon"
                style={{
                  background: selectedPoi.color + '15',
                  color: selectedPoi.color,
                  width: '48px',
                  height: '48px',
                }}
              >
                <selectedPoi.icon size={24} />
              </div>
              <div>
                <h3 className="news-modal-title" style={{ marginBottom: '4px' }}>
                  {selectedPoi.name}
                </h3>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {selectedPoi.category} · {selectedPoi.address}
                </span>
              </div>
            </div>
            <p className="news-modal-content">{selectedPoi.description}</p>
            <button
              className="send-btn"
              style={{
                marginTop: '20px',
                width: '100%',
                height: '40px',
                borderRadius: 'var(--radius-md)',
              }}
              onClick={() => setSelectedPoi(null)}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CampusMap
