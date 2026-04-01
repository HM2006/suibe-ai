/* ========================================
   小贸 - 成绩查询页面
   成绩列表 + GPA统计 + 学期筛选 + 成绩分布图表
   数据来源：用户页面登录教务系统后自动缓存
   ======================================== */
import { useState, useMemo, useEffect } from 'react'
import { TrendingUp, Award, BookOpen, BarChart3 } from 'lucide-react'
import { useUser } from '../contexts/UserContext'

/* 模拟成绩数据 - 作为fallback保留 */
const mockGradesData = [
  { id: 1, course: '高等数学A', credit: 4, score: 92, grade: 'A', semester: '2024-2025-1', type: '必修' },
  { id: 2, course: '大学英语(三)', credit: 3, score: 88, grade: 'A-', semester: '2024-2025-1', type: '必修' },
  { id: 3, course: '数据结构与算法', credit: 4, score: 95, grade: 'A+', semester: '2024-2025-1', type: '必修' },
  { id: 4, course: '线性代数', credit: 3, score: 85, grade: 'B+', semester: '2024-2025-1', type: '必修' },
  { id: 5, course: '计算机网络', credit: 3, score: 90, grade: 'A', semester: '2024-2025-1', type: '必修' },
  { id: 6, course: '思想政治理论', credit: 2, score: 82, grade: 'B+', semester: '2024-2025-1', type: '必修' },
  { id: 7, course: '体育(三)', credit: 1, score: 88, grade: 'A-', semester: '2024-2025-1', type: '必修' },
  { id: 8, course: '人工智能导论', credit: 2, score: 93, grade: 'A', semester: '2024-2025-1', type: '选修' },
  { id: 9, course: '操作系统', credit: 4, score: 89, grade: 'A-', semester: '2024-2025-2', type: '必修' },
  { id: 10, course: '数据库原理', credit: 3, score: 94, grade: 'A', semester: '2024-2025-2', type: '必修' },
  { id: 11, course: '概率论与数理统计', credit: 3, score: 78, grade: 'B', semester: '2024-2025-2', type: '必修' },
  { id: 12, course: '软件工程', credit: 3, score: 91, grade: 'A', semester: '2024-2025-2', type: '必修' },
  { id: 13, course: '大学英语(四)', credit: 3, score: 86, grade: 'A-', semester: '2024-2025-2', type: '必修' },
  { id: 14, course: 'Web前端开发', credit: 2, score: 96, grade: 'A+', semester: '2024-2025-2', type: '选修' },
  { id: 15, course: '创新创业基础', credit: 2, score: 90, grade: 'A', semester: '2024-2025-2', type: '选修' },
]

/* 模拟学期列表 */
const mockSemesters = ['全部', '2024-2025-2', '2024-2025-1']

/* 成绩等级对应的样式类名 */
function getGradeBadgeClass(score) {
  if (score >= 90) return 'excellent'
  if (score >= 80) return 'good'
  if (score >= 60) return 'pass'
  return 'fail'
}

/* 成绩等级对应的中文描述 */
function getGradeLabel(score) {
  if (score >= 90) return '优秀'
  if (score >= 80) return '良好'
  if (score >= 70) return '中等'
  if (score >= 60) return '及格'
  return '不及格'
}

/* 计算GPA（4.0制）- 按分数段标准转换 */
function calcGPA(grades) {
  if (grades.length === 0) return 0
  let totalPoints = 0
  let totalCredits = 0
  grades.forEach((g) => {
    const score = typeof g.score === 'number' ? g.score : (g.scoreNum || 0)
    let point = 0
    if (score >= 90) point = 4.0
    else if (score >= 85) point = 3.7
    else if (score >= 82) point = 3.3
    else if (score >= 78) point = 3.0
    else if (score >= 75) point = 2.7
    else if (score >= 72) point = 2.3
    else if (score >= 68) point = 2.0
    else if (score >= 64) point = 1.5
    else if (score >= 60) point = 1.0
    else point = 0
    totalPoints += point * g.credit
    totalCredits += g.credit
  })
  return (totalPoints / totalCredits).toFixed(2)
}

/* 将真实成绩数据转换为组件格式 */
function transformRealGrades(realData) {
  let grades = null
  if (Array.isArray(realData)) {
    grades = realData
  } else if (realData && Array.isArray(realData.grades)) {
    grades = realData.grades
  }
  if (!grades) return null

  return grades.map((item, index) => ({
    id: index + 1,
    course: item.courseName,
    credit: item.credit,
    /* 优先使用数字分数，如果是等级文字则用 scoreNum */
    score: typeof item.score === 'number' ? item.score : (item.scoreNum || item.score),
    scoreNum: item.scoreNum || (typeof item.score === 'number' ? item.score : 0),
    grade: item.grade || '',
    semester: item.semester,
    type: item.type || '必修',
    gpaPoint: item.gpaPoint || 0,
    finalScore: item.finalScore,
  }))
}

/* 从成绩数据中提取学期列表 */
function extractSemesters(grades) {
  const semesterSet = new Set()
  grades.forEach((g) => semesterSet.add(g.semester))
  const semesterList = Array.from(semesterSet).sort().reverse()
  return ['全部', ...semesterList]
}

function GradesPage() {
  const [selectedSemester, setSelectedSemester] = useState('全部')
  const { user, token } = useUser()

  /* 真实成绩数据（从缓存加载） */
  const [realGrades, setRealGrades] = useState(null)
  const [realGPA, setRealGPA] = useState(null)
  const [realTotalCredits, setRealTotalCredits] = useState(null)
  const [dataSource, setDataSource] = useState('mock')

  /* 组件挂载时，从profile获取缓存的成绩数据 */
  useEffect(() => {
    const loadCachedGrades = async () => {
      if (!token) return
      try {
        const res = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = await res.json()
        if (data.success && data.data?.gradesCache) {
          const gradesRaw = data.data.gradesCache.data
          const transformed = transformRealGrades(
            gradesRaw?.grades || gradesRaw
          )
          if (transformed && transformed.length > 0) {
            setRealGrades(transformed)
            setRealGPA(data.data.gradesCache.gpa || null)
            setRealTotalCredits(data.data.gradesCache.total_credits || null)
            setDataSource('cached')
          }
        }
      } catch (err) {
        console.warn('加载缓存成绩失败:', err)
      }
    }
    loadCachedGrades()
  }, [token])

  /* 当前使用的成绩数据 */
  const gradesData = realGrades || mockGradesData
  /* 当前使用的学期列表 */
  const semesters = realGrades ? extractSemesters(realGrades) : mockSemesters

  /* 根据学期筛选成绩 */
  const filteredGrades = useMemo(() => {
    if (selectedSemester === '全部') return gradesData
    return gradesData.filter((g) => g.semester === selectedSemester)
  }, [selectedSemester, gradesData])

  /* 统计数据 */
  const stats = useMemo(() => {
    const scores = filteredGrades.map((g) => typeof g.score === 'number' ? g.score : (g.scoreNum || 0))
    const totalCredits = filteredGrades.reduce((sum, g) => sum + g.credit, 0)
    const validScores = scores.filter(s => typeof s === 'number' && s > 0)
    const avgScore = validScores.length > 0
      ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
      : 0
    const maxScore = validScores.length > 0 ? Math.max(...validScores) : 0

    /* 如果是真实数据且显示全部学期，使用后端返回的GPA */
    let gpa
    if (dataSource === 'cached' && selectedSemester === '全部' && realGPA) {
      gpa = realGPA
    } else {
      gpa = calcGPA(filteredGrades)
    }

    let displayTotalCredits
    if (dataSource === 'cached' && selectedSemester === '全部' && realTotalCredits) {
      displayTotalCredits = realTotalCredits
    } else {
      displayTotalCredits = totalCredits
    }

    return { avgScore, maxScore, gpa, totalCredits: displayTotalCredits, count: filteredGrades.length }
  }, [filteredGrades, dataSource, selectedSemester, realGPA, realTotalCredits])

  /* 成绩分布数据 */
  const distribution = useMemo(() => {
    const ranges = [
      { label: '90-100', min: 90, max: 100, color: '#059669' },
      { label: '80-89', min: 80, max: 89, color: '#4F46E5' },
      { label: '70-79', min: 70, max: 79, color: '#D97706' },
      { label: '60-69', min: 60, max: 69, color: '#F59E0B' },
      { label: '<60', min: 0, max: 59, color: '#EF4444' },
    ]
    const total = filteredGrades.length || 1
    return ranges.map((range) => {
      const count = filteredGrades.filter((g) => {
        const s = typeof g.score === 'number' ? g.score : (g.scoreNum || 0)
        return s >= range.min && s <= range.max
      }).length
      return { ...range, count, percent: Math.round((count / total) * 100) }
    })
  }, [filteredGrades])

  return (
    <div className="grades-container">
      {/* 页面标题 */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">成绩查询</h1>
          <p className="page-desc">查看各科成绩和学业统计</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`data-source-tag ${dataSource}`}>
            {dataSource === 'cached' ? '教务数据' : '模拟数据'}
          </span>
        </div>
      </div>

      {/* 未连接教务系统提示 */}
      {dataSource === 'mock' && (
        <div style={{
          padding: '12px 16px',
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#92400E',
          marginBottom: '16px',
        }}>
          当前显示模拟数据。请前往「用户」页面连接教务系统以获取真实成绩。
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grades-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.gpa}</div>
          <div className="stat-label">GPA</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avgScore}</div>
          <div className="stat-label">平均分</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.maxScore}</div>
          <div className="stat-label">最高分</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalCredits}</div>
          <div className="stat-label">总学分</div>
        </div>
      </div>

      {/* 学期筛选 */}
      <div className="grades-filter">
        {semesters.map((sem) => (
          <button
            key={sem}
            className={`filter-btn ${selectedSemester === sem ? 'active' : ''}`}
            onClick={() => setSelectedSemester(sem)}
          >
            {sem === '全部' ? '全部学期' : sem.replace(/(\d{4})-(\d{4})-(\d)/, '$1-$2学年 第$3学期')}
          </button>
        ))}
      </div>

      {/* 成绩表格 */}
      <div className="grades-table">
        {/* 表头 */}
        <div className="grade-row header">
          <div>课程名称</div>
          <div>学分</div>
          <div className="grade-credit">成绩</div>
          <div>绩点</div>
          <div>类型</div>
        </div>

        {/* 成绩行 */}
        {filteredGrades.map((grade) => {
          const score = typeof grade.score === 'number' ? grade.score : (grade.scoreNum || 0)
          return (
            <div key={grade.id} className="grade-row">
              <div style={{ fontWeight: 500 }}>{grade.course}</div>
              <div>{grade.credit}</div>
              <div className="grade-credit" style={{ fontWeight: 600 }}>
                {typeof grade.score === 'number' ? grade.score : grade.score}
              </div>
              <div>
                {grade.gpaPoint > 0 ? (
                  <span className={`grade-badge ${getGradeBadgeClass(score)}`}>
                    {grade.gpaPoint.toFixed(1)}
                  </span>
                ) : (
                  <span className={`grade-badge ${getGradeBadgeClass(score)}`}>
                    {grade.grade} {getGradeLabel(score)}
                  </span>
                )}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                {grade.type}
              </div>
            </div>
          )
        })}
      </div>

      {/* 成绩分布图表 */}
      <div className="grade-distribution">
        <h3 className="grade-distribution-title">成绩分布</h3>
        <div className="bar-chart">
          {distribution.map((item) => (
            <div key={item.label} className="bar-item">
              <span className="bar-label">{item.label}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.max(item.percent, 5)}%`,
                    background: item.color,
                  }}
                >
                  {item.count > 0 && `${item.count}门`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default GradesPage
