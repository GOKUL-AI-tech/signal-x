import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { useDarkMode } from '../context/DarkModeContext'

const DEPT_META = {
  IT_SUPPORT:   { icon:'💻', label:'IT Support',  color:'#6366f1' },
  LAB_INCHARGE: { icon:'🧪', label:'Lab',          color:'#8b5cf6' },
  LIBRARIAN:    { icon:'📚', label:'Library',      color:'#0ea5e9' },
  TRANSPORT:    { icon:'🚌', label:'Transport',    color:'#f59e0b' },
  HOSTEL:       { icon:'🏠', label:'Hostel',       color:'#10b981' },
  OFFICE:       { icon:'🏢', label:'Office',       color:'#64748b' },
  FACULTY:      { icon:'👨‍🏫', label:'Faculty',     color:'#ec4899' },
}

function DonutChart({ data, size = 180 }) {
  const { dark } = useDarkMode()
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div style={{ width: size, height: size, borderRadius: '50%', background: dark ? '#1c2333' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>No data</div>

  const r = 70, cx = size / 2, cy = size / 2
  const circumference = 2 * Math.PI * r

  const slices = data.map(d => ({
    ...d,
    pct:  d.value / total,
    dash: (d.value / total) * circumference,
    gap:  circumference - (d.value / total) * circumference,
  })).map((d, i, arr) => ({
    ...d,
    offset: arr.slice(0, i).reduce((sum, s) => sum + s.dash, 0),
  }))

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={dark ? "#21262d" : "#f1f5f9"} strokeWidth={24} />
        {slices.map((sl, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={sl.color} strokeWidth={24}
            strokeDasharray={`${sl.dash} ${sl.gap}`}
            strokeDashoffset={-sl.offset}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: dark ? '#e6edf3' : '#0f172a' }}>{total}</div>
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>TOTAL</div>
      </div>
    </div>
  )
}

function BarChart({ data, maxVal }) {
  const { dark } = useDarkMode()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: dark ? '#c9d1d9' : '#374151' }}>{d.icon} {d.label}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: d.color }}>{d.value}</span>
          </div>
          <div style={{ height: 10, background: dark ? '#1c2333' : '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '999px',
              background: `linear-gradient(90deg, ${d.color}cc, ${d.color})`,
              width: `${maxVal > 0 ? (d.value / maxVal) * 100 : 0}%`,
              transition: 'width 0.8s ease',
              minWidth: d.value > 0 ? '6px' : '0',
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { user } = useAuth()
  const { dark } = useDarkMode()
  const s = makeStyles(dark)
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const { data } = await supabase.from('complaints').select('*').order('created_at', { ascending: false })
    setComplaints(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll()
    const sub = supabase.channel('analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [fetchAll])

  // ── Compute stats ──
  const total    = complaints.length
  const resolved = complaints.filter(c => c.status === 'Resolved').length
  const newC     = complaints.filter(c => c.status === 'New').length
  const inReview = complaints.filter(c => c.status === 'Under Review').length
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0

  // Dept breakdown
  const deptData = Object.entries(DEPT_META).map(([key, meta]) => ({
    ...meta,
    key,
    value: complaints.filter(c => c.assigned_role === key).length,
  })).sort((a, b) => b.value - a.value)
  const maxDept = Math.max(...deptData.map(d => d.value), 1)

  // Status donut data
  const donutData = [
    { label: 'New',          value: newC,      color: '#ef4444' },
    { label: 'Under Review', value: inReview,  color: '#f97316' },
    { label: 'Resolved',     value: resolved,  color: '#10b981' },
  ]

  // Weekly trend (last 7 days)
  const today = new Date()
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    return d
  })
  const weekLabels = weekDays.map(d => d.toLocaleDateString('en-IN', { weekday: 'short' }))
  const weekCounts = weekDays.map(d => {
    const start = new Date(d); start.setHours(0, 0, 0, 0)
    const end   = new Date(d); end.setHours(23, 59, 59, 999)
    return complaints.filter(c => {
      const t = new Date(c.created_at)
      return t >= start && t <= end
    }).length
  })
  const maxWeek = Math.max(...weekCounts, 1)

  // Recent 5 complaints
  const recent = complaints.slice(0, 5)

  const sideLinks = user.role === 'ADMIN'
    ? [{ to:'/admin', icon:'🏠', label:'Dashboard' }, { to:'/users', icon:'👥', label:'Users' }, { to:'/announce', icon:'📢', label:'Announcements' }, { to:'/analytics', icon:'📊', label:'Analytics' }]
    : [{ to:'/hod', icon:'🏠', label:'Dashboard' }, { to:'/announce', icon:'📢', label:'Announcements' }, { to:'/analytics', icon:'📊', label:'Analytics' }]

  // ── Trend detection: top keywords this week ──
  const thisWeekComplaints = complaints.filter(c => {
    const d = new Date(c.created_at)
    const now = new Date()
    return (now - d) / (1000 * 60 * 60 * 24) <= 7
  })
  const wordFreq = {}
  const stopwords = new Set(['the','and','is','in','of','to','a','my','our','for','are','not','was','has','its','it','we','i','on','at','this','that','with','have','been','from','an'])
  thisWeekComplaints.forEach(c => {
    c.issue_text.toLowerCase().replace(/[^a-z\s]/g,'').split(/\s+/).forEach(w => {
      if (w.length > 3 && !stopwords.has(w)) wordFreq[w] = (wordFreq[w]||0) + 1
    })
  })
  const topKeywords = Object.entries(wordFreq).sort((a,b) => b[1]-a[1]).slice(0,10)

  // ── Avg resolution time per dept ──
  const deptAvgTime = Object.entries(DEPT_META).reduce((acc, [key]) => {
    const resolved = complaints.filter(c => c.assigned_role === key && c.status === 'Resolved' && c.resolved_at)
    if (!resolved.length) { acc[key] = null; return acc }
    const avg = resolved.reduce((s, c) => s + (new Date(c.resolved_at) - new Date(c.created_at)), 0) / resolved.length
    acc[key] = Math.round(avg / (1000 * 60 * 60))  // hours
    return acc
  }, {})

  return (
    <div style={s.layout}>
      <Sidebar links={sideLinks} />

      <div style={s.main}>

        {/* ── Hero ── */}
        <div style={s.hero}>
          <div style={s.heroPattern} />
          <div style={s.heroContent}>
            <p style={s.heroSub}>📊 Live Analytics</p>
            <h1 style={s.heroTitle}>Complaint Intelligence</h1>
            <p style={s.heroDesc}>Real-time insights across all departments</p>
          </div>
          {/* KPI strip */}
          <div style={s.kpiRow}>
            {[
              { label:'Total Complaints', value: total,          icon:'📋', grad:'rgba(255,255,255,0.15)' },
              { label:'Resolution Rate',  value:`${resolutionRate}%`, icon:'✅', grad:'linear-gradient(135deg,#10b981,#059669)' },
              { label:'Pending',          value: newC,           icon:'🔔', grad:'linear-gradient(135deg,#ef4444,#dc2626)' },
              { label:'In Review',        value: inReview,       icon:'🔍', grad:'linear-gradient(135deg,#f97316,#ea580c)' },
            ].map(k => (
              <div key={k.label} style={{ ...s.kpi, background: k.grad }}>
                <div style={s.kpiIcon}>{k.icon}</div>
                <div style={s.kpiValue}>{k.value}</div>
                <div style={s.kpiLabel}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>

        {loading && <div style={s.loadingBar}>⏳ Loading analytics data…</div>}

        {/* ── Row 1: Donut + Bar ── */}
        <div style={s.row}>

          {/* Status Distribution */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>📊 Status Distribution</h3>
            <p style={s.cardSub}>Breakdown of all complaints by current status</p>
            <div style={s.donutWrap}>
              <DonutChart data={donutData} size={190} />
              <div style={s.donutLegend}>
                {donutData.map(d => (
                  <div key={d.label} style={s.legendItem}>
                    <div style={{ ...s.legendDot, background: d.color }} />
                    <span style={s.legendLabel}>{d.label}</span>
                    <span style={{ ...s.legendVal, color: d.color }}>{d.value}</span>
                    <span style={s.legendPct}>
                      {total > 0 ? `${Math.round((d.value / total) * 100)}%` : '0%'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dept Breakdown */}
          <div style={{ ...s.card, flex: 1.4 }}>
            <h3 style={s.cardTitle}>🏢 Complaints by Department</h3>
            <p style={s.cardSub}>Total complaints routed to each department</p>
            <div style={{ marginTop: 20 }}>
              <BarChart data={deptData} maxVal={maxDept} />
            </div>
          </div>

        </div>

        {/* ── Row 2: Weekly trend + Recent ── */}
        <div style={s.row}>

          {/* Weekly trend */}
          <div style={{ ...s.card, flex: 1.2 }}>
            <h3 style={s.cardTitle}>📈 Weekly Complaint Trend</h3>
            <p style={s.cardSub}>Complaints submitted over the last 7 days</p>
            <div style={s.trendWrap}>
              {weekCounts.map((count, i) => (
                <div key={i} style={s.trendCol}>
                  <div style={s.trendBarWrap}>
                    <div style={{
                      ...s.trendBar,
                      height: `${(count / maxWeek) * 100}%`,
                      background: count > 0 ? 'linear-gradient(180deg,#6366f1,#4f46e5)' : '#f1f5f9',
                      minHeight: count > 0 ? '8px' : '4px',
                    }} />
                  </div>
                  <div style={s.trendCount}>{count || ''}</div>
                  <div style={s.trendLabel}>{weekLabels[i]}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent complaints */}
          <div style={{ ...s.card, flex: 1 }}>
            <h3 style={s.cardTitle}>🕐 Recent Complaints</h3>
            <p style={s.cardSub}>Last 5 submitted</p>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recent.length === 0 ? (
                <div style={{ color:'#94a3b8', textAlign:'center', padding:'20px 0', fontSize:13 }}>No complaints yet</div>
              ) : recent.map(c => {
                const meta = DEPT_META[c.assigned_role]
                const STATUS_COLOR = { New:'#ef4444', 'Under Review':'#f97316', Resolved:'#10b981' }
                return (
                  <div key={c.id} style={s.recentItem}>
                    <div style={{ ...s.recentDot, background: meta?.color || '#94a3b8' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={s.recentIssue} title={c.issue_text}>{c.issue_text}</div>
                      <div style={s.recentMeta}>
                        <span style={{ color: meta?.color, fontWeight: 600 }}>{meta?.icon} {meta?.label}</span>
                        <span>·</span>
                        <span style={{ color: STATUS_COLOR[c.status] || '#64748b', fontWeight: 600 }}>{c.status}</span>
                        <span>·</span>
                        <span>{new Date(c.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</span>
                      </div>
                    </div>
                    <span style={s.recentTicket}>{c.ticket_id}</span>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* ── Row 3: Trend Detection ── */}
        {topKeywords.length > 0 && (
          <div style={{ ...s.card, margin:'0 32px' }}>
            <h3 style={s.cardTitle}>🔥 This Week's Trending Issues</h3>
            <p style={s.cardSub}>Most frequent words in complaints submitted in the last 7 days</p>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:16 }}>
              {topKeywords.map(([word, count]) => (
                <span key={word} style={{ padding:'6px 14px', borderRadius:'999px', fontSize:13, fontWeight:700,
                  background: count >= 3 ? '#fee2e2' : count >= 2 ? '#fff7ed' : '#f1f5f9',
                  color: count >= 3 ? '#dc2626' : count >= 2 ? '#c2410c' : '#475569',
                  border: `1px solid ${count >= 3 ? '#fca5a5' : count >= 2 ? '#fb923c' : '#e2e8f0'}` }}>
                  {word} <span style={{opacity:0.6}}>×{count}</span>
                </span>
              ))}
            </div>
            {thisWeekComplaints.length > 0 && (
              <div style={{ marginTop:12, fontSize:12, color: dark ? '#8b949e' : '#64748b' }}>
                Based on {thisWeekComplaints.length} complaint{thisWeekComplaints.length>1?'s':''} this week
              </div>
            )}
          </div>
        )}

        {/* ── Row 4: Dept Performance table ── */}
        <div style={{ ...s.card, margin:'0 32px' }}>
          <h3 style={s.cardTitle}>🎯 Department Performance</h3>
          <p style={s.cardSub}>Complaint counts, resolution rates and avg response time per department</p>
          <div style={{ overflowX:'auto', marginTop:16 }}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {['Department','Total','New','In Review','Resolved','Avg Time','Resolution Rate'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deptData.filter(d => d.value > 0).map((d, i) => {
                  const dTotal    = d.value
                  const dNew      = complaints.filter(c => c.assigned_role === d.key && c.status === 'New').length
                  const dReview   = complaints.filter(c => c.assigned_role === d.key && c.status === 'Under Review').length
                  const dResolved = complaints.filter(c => c.assigned_role === d.key && c.status === 'Resolved').length
                  const dRate     = dTotal > 0 ? Math.round((dResolved / dTotal) * 100) : 0
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? (dark ? '#161b22' : '#fff') : (dark ? '#1a2233' : '#fafbff'), borderBottom: `1px solid ${dark ? '#21262d' : '#f1f5f9'}` }}>
                      <td style={s.td}>
                        <span style={{ ...s.deptPill, background: d.color + '20', color: d.color }}>
                          {d.icon} {d.label}
                        </span>
                      </td>
                      <td style={{ ...s.td, fontWeight:800, color: dark ? '#e6edf3' : '#0f172a' }}>{dTotal}</td>
                      <td style={{ ...s.td, color:'#ef4444', fontWeight:600 }}>{dNew}</td>
                      <td style={{ ...s.td, color:'#f97316', fontWeight:600 }}>{dReview}</td>
                      <td style={{ ...s.td, color:'#10b981', fontWeight:600 }}>{dResolved}</td>
                      <td style={s.td}>
                        {deptAvgTime[d.key] !== null && deptAvgTime[d.key] !== undefined
                          ? <span style={{ fontWeight:700, color: deptAvgTime[d.key] <= 24 ? '#10b981' : deptAvgTime[d.key] <= 72 ? '#f59e0b' : '#ef4444' }}>
                              {deptAvgTime[d.key]}h
                            </span>
                          : <span style={{color:'#94a3b8'}}>—</span>
                        }
                      </td>
                      <td style={s.td}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:8, background: dark ? '#1c2333' : '#f1f5f9', borderRadius:'999px', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${dRate}%`, background: dRate >= 70 ? '#10b981' : dRate >= 40 ? '#f59e0b' : '#ef4444', borderRadius:'999px' }} />
                          </div>
                          <span style={{ fontSize:13, fontWeight:800, color: dRate >= 70 ? '#10b981' : dRate >= 40 ? '#f59e0b' : '#ef4444', minWidth:36 }}>{dRate}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {deptData.filter(d => d.value > 0).length === 0 && (
                  <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>No complaints yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

const makeStyles = (dark) => ({
  layout: { display:'flex', minHeight:'100vh', background: dark ? '#0d1117' : '#f0f2f8' },
  main:   { flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:20, paddingBottom:32, overflow:'hidden' },

  hero: { position:'relative', overflow:'hidden', padding:'36px 32px 0', background:'linear-gradient(135deg,#312e81,#4c1d95,#1e1b4b)' },
  heroPattern: { position:'absolute', inset:0, opacity:0.05, backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize:'20px 20px' },
  heroContent: { position:'relative', zIndex:1, marginBottom:24 },
  heroSub: { color:'#c4b5fd', fontSize:11, fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', marginBottom:6 },
  heroTitle: { color:'#fff', fontSize:28, fontWeight:800, marginBottom:6 },
  heroDesc: { color:'rgba(255,255,255,0.6)', fontSize:14 },
  kpiRow: { position:'relative', zIndex:1, display:'flex', gap:14, flexWrap:'wrap', paddingBottom:28 },
  kpi: { flex:1, minWidth:160, borderRadius:16, padding:'18px 20px', boxShadow:'0 8px 24px rgba(0,0,0,0.15)' },
  kpiIcon: { fontSize:24, marginBottom:6 },
  kpiValue: { fontSize:30, fontWeight:800, color:'#fff', lineHeight:1 },
  kpiLabel: { fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:'0.5px', marginTop:4 },

  loadingBar: { margin:'0 32px', background: dark?'rgba(99,102,241,0.1)':'#eef2ff', border: `1px solid ${dark?'#3730a3':'#c7d2fe'}`, borderRadius:12, padding:'12px 18px', fontSize:13, color: dark?'#a5b4fc':'#4f46e5', fontWeight:600 },

  row: { display:'flex', gap:20, padding:'0 32px', flexWrap:'wrap' },
  card: { flex:1, minWidth:280, background: dark ? '#161b22' : '#fff', borderRadius:20, padding:24, border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}`, boxShadow:'0 4px 20px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize:16, fontWeight:800, color: dark ? '#e6edf3' : '#0f172a', marginBottom:3 },
  cardSub: { fontSize:13, color: dark ? '#8b949e' : '#64748b' },

  donutWrap: { display:'flex', alignItems:'center', gap:28, marginTop:20, flexWrap:'wrap' },
  donutLegend: { display:'flex', flexDirection:'column', gap:10, flex:1 },
  legendItem: { display:'flex', alignItems:'center', gap:8 },
  legendDot: { width:12, height:12, borderRadius:'50%', flexShrink:0 },
  legendLabel: { flex:1, fontSize:13, color: dark ? '#c9d1d9' : '#374151', fontWeight:500 },
  legendVal: { fontSize:15, fontWeight:800 },
  legendPct: { fontSize:12, color:'#94a3b8', minWidth:32, textAlign:'right' },

  trendWrap: { display:'flex', alignItems:'flex-end', gap:8, marginTop:20, height:140 },
  trendCol: { flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, height:'100%' },
  trendBarWrap: { flex:1, display:'flex', alignItems:'flex-end', width:'100%' },
  trendBar: { width:'100%', borderRadius:'6px 6px 0 0', transition:'height 0.6s ease' },
  trendCount: { fontSize:11, fontWeight:700, color:'#6366f1', minHeight:16 },
  trendLabel: { fontSize:11, color:'#94a3b8', fontWeight:500 },

  recentItem: { display:'flex', alignItems:'flex-start', gap:10, padding:'10px', background: dark ? '#1c2333' : '#f8fafc', borderRadius:10, border: `1px solid ${dark ? '#30363d' : '#f1f5f9'}` },
  recentDot: { width:10, height:10, borderRadius:'50%', flexShrink:0, marginTop:3 },
  recentIssue: { fontSize:13, fontWeight:600, color: dark ? '#e6edf3' : '#0f172a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:3 },
  recentMeta: { display:'flex', gap:6, fontSize:12, color: dark ? '#8b949e' : '#64748b', alignItems:'center', flexWrap:'wrap' },
  recentTicket: { fontFamily:'monospace', fontSize:11, fontWeight:800, color: dark?'#a5b4fc':'#6366f1', background: dark?'rgba(99,102,241,0.15)':'#eef2ff', padding:'2px 7px', borderRadius:5, flexShrink:0 },

  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background: dark ? 'linear-gradient(90deg,#161b22,#1c2333)' : 'linear-gradient(90deg,#f8fafc,#f0f4ff)' },
  th: { textAlign:'left', padding:'12px 14px', fontSize:11, fontWeight:700, color: dark ? '#8b949e' : '#64748b', textTransform:'uppercase', letterSpacing:'0.8px', borderBottom: `2px solid ${dark ? '#21262d' : '#f1f5f9'}`, whiteSpace:'nowrap' },
  td: { padding:'13px 14px', fontSize:13, color: dark ? '#c9d1d9' : '#374151', verticalAlign:'middle' },
  deptPill: { padding:'4px 12px', borderRadius:'999px', fontSize:12, fontWeight:700 },
})
