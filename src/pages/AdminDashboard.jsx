import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useAIPriority } from '../hooks/useAIPriority'
import Sidebar from '../components/Sidebar'
import { useDarkMode } from '../context/DarkModeContext'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import StatCard from '../components/StatCard'
import AgeBadge from '../components/AgeBadge'

const DEPTS = {
  IT_SUPPORT:   { icon:'💻', label:'IT Support',  color:'#6366f1', bg:'#eef2ff' },
  LAB_INCHARGE: { icon:'🧪', label:'Lab',          color:'#8b5cf6', bg:'#f5f3ff' },
  LIBRARIAN:    { icon:'📚', label:'Library',      color:'#0ea5e9', bg:'#e0f2fe' },
  TRANSPORT:    { icon:'🚌', label:'Transport',    color:'#f59e0b', bg:'#fef3c7' },
  HOSTEL:       { icon:'🏠', label:'Hostel',       color:'#10b981', bg:'#d1fae5' },
  OFFICE:       { icon:'🏢', label:'Office',       color:'#64748b', bg:'#f1f5f9' },
  FACULTY:      { icon:'👨‍🏫', label:'Faculty',     color:'#ec4899', bg:'#fce7f3' },
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const { dark } = useDarkMode()
  const s = makeStyles(dark)
  const navigate = useNavigate()

  const exportCSV = () => {
    const headers = ['Ticket ID','Student','Issue','Department','Status','Emotion Flag','Created At']
    const rows = complaints.map(c => [
      c.ticket_id, c.anonymous ? 'Anonymous' : c.user_id, `"${c.issue_text.replace(/"/g,'""')}"`,
      c.assigned_role, c.status, c.emotion_flag || '', new Date(c.created_at).toLocaleString('en-IN')
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `nexus_complaints_${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }
  const [complaints,    setComplaints]    = useState([])
  const [deptFilter,    setDeptFilter]    = useState('ALL')
  const [statusFilter,  setStatusFilter]  = useState('All')
  const [search,        setSearch]        = useState('')
  const [activeTab,     setActiveTab]     = useState('all')

  const fetchComplaints = useCallback(async () => {
    const { data } = await supabase.from('complaints').select('*').order('created_at', { ascending: false })
    setComplaints(data || [])
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchComplaints()
    const sub = supabase.channel('admin-live')
      .on('postgres_changes', { event:'*', schema:'public', table:'complaints' }, fetchComplaints)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [fetchComplaints])

  const updateStatus = async (ticketId, newStatus) => {
    await supabase.from('complaints').update({ status: newStatus }).eq('ticket_id', ticketId)
    fetchComplaints()
  }

  const { priorities, loading: aiLoading } = useAIPriority(complaints)
  const getPriority = c => priorities[c.ticket_id] || { level:'Low', color:'#10b981', bg:'#d1fae5', score:0, tag:'Analyzing…' }

  const unassigned = complaints.filter(c => c.assigned_role === 'UNASSIGNED')
  const assigned   = complaints.filter(c => c.assigned_role !== 'UNASSIGNED')
  const sorted     = [...assigned].sort((a,b) => (getPriority(b).score||0) - (getPriority(a).score||0))
  const urgent     = sorted.filter(c => { const p=getPriority(c); return (p.level==='Critical'||p.level==='High') && c.status!=='Resolved' })
  const escalated  = complaints.filter(c => c.escalated === true && c.status !== 'Resolved')

  const display = (activeTab==='urgent' ? urgent : sorted).filter(c => {
    const matchDept   = deptFilter==='ALL' || c.assigned_role===deptFilter
    const matchStatus = statusFilter==='All' || c.status===statusFilter
    const matchSearch = !search || [c.ticket_id,c.user_id,c.issue_text].some(f=>f?.toLowerCase().includes(search.toLowerCase()))
    return matchDept && matchStatus && matchSearch
  })

  const stats = {
    total:      complaints.length,
    unassigned: unassigned.length,
    inReview:   complaints.filter(c=>c.status==='Under Review').length,
    resolved:   complaints.filter(c=>c.status==='Resolved').length,
  }

  return (
    <div style={s.layout}>
      <Sidebar links={[
        { to:'/admin',     icon:'🏠', label:'Dashboard' },
        { to:'/users',     icon:'👥', label:'Users' },
        { to:'/announce',  icon:'📢', label:'Announcements' },
        { to:'/analytics', icon:'📊', label:'Analytics' },
      ]} />

      <div style={s.main}>

        {/* ── Hero ── */}
        <div style={s.hero}>
          <div style={s.heroPattern} />
          <div style={s.heroBlob} />
          <div style={s.heroContent}>
            <div>
              <p style={s.heroSub}>👑 Principal Dashboard</p>
              <h1 style={s.heroTitle}>Welcome back, {user.username}</h1>
              <p style={s.heroDesc}>Complete oversight of all college complaints</p>
            </div>
          </div>
          <div style={s.heroStats}>
            <StatCard icon="📋" label="Total"       value={stats.total}       gradient="linear-gradient(135deg,#6366f1,#4f46e5)" />
            <StatCard icon="📥" label="Unassigned"  value={stats.unassigned}  gradient={stats.unassigned>0?"linear-gradient(135deg,#f59e0b,#d97706)":"rgba(255,255,255,0.15)"} sub={stats.unassigned>0?'Awaiting HOD':''} />
            <StatCard icon="🔍" label="In Review"   value={stats.inReview}    gradient="linear-gradient(135deg,#f97316,#ea580c)" />
            <StatCard icon="✅" label="Resolved"    value={stats.resolved}    gradient="linear-gradient(135deg,#10b981,#059669)" />
            <StatCard icon="🚨" label="AI Urgent"   value={urgent.length}     gradient="linear-gradient(135deg,#dc2626,#991b1b)" sub={urgent.length>0?'AI flagged':''} />
          </div>
        </div>

        {/* AI bar */}
        {aiLoading && <div style={s.aiBar}>🤖 AI is analyzing all complaints for smart priority scoring…</div>}

        {/* Unassigned alert */}
        {unassigned.length > 0 && (
          <div style={s.unassignedBanner}>
            <span style={{fontSize:24}}>📥</span>
            <div style={{flex:1}}>
              <div style={s.unassignedTitle}>{unassigned.length} complaint{unassigned.length>1?'s':''} waiting for HOD to assign a department</div>
              <div style={s.unassignedChips}>
                {unassigned.slice(0,3).map(c=>(
                  <span key={c.id} style={s.unassignedChip}>{c.ticket_id} · {c.anonymous ? "🕵️ Anonymous" : c.user_id}</span>
                ))}
                {unassigned.length>3 && <span style={s.unassignedChip}>+{unassigned.length-3} more</span>}
              </div>
            </div>
            <span style={s.unassignedNote}>HOD must assign before staff can act</span>
          </div>
        )}

        {/* Urgent banner */}
        {urgent.length > 0 && (
          <div style={s.urgentBanner}>
            <span style={{fontSize:26, flexShrink:0}}>🚨</span>
            <div style={{flex:1}}>
              <div style={s.urgentTitle}>AI Alert — {urgent.length} complaint{urgent.length>1?'s':''} require immediate action</div>
              <div style={s.urgentChips}>
                {urgent.slice(0,3).map(c => {
                  const p = getPriority(c)
                  return <span key={c.id} style={s.urgentChip}>{c.ticket_id} · {p.tag}</span>
                })}
                {urgent.length>3 && <span style={s.urgentChip}>+{urgent.length-3} more</span>}
              </div>
            </div>
            <button style={s.urgentBtn} onClick={() => setActiveTab('urgent')}>View Urgent →</button>
          </div>
        )}

        {/* ── Emotional Escalation Alert ── */}
        {escalated.length > 0 && (
          <div style={s.escalationBox}>
            <div style={s.escalationHeader}>
              <span style={{fontSize:36, flexShrink:0}}>🆘</span>
              <div style={{flex:1}}>
                <div style={s.escalationTitle}>
                  Principal Alert — {escalated.length} Emotional Distress Complaint{escalated.length>1?'s':''}
                </div>
                <div style={s.escalationSub}>
                  AI detected emotional distress in the student's own words. Auto-escalated to you and HOD. Requires immediate human review.
                </div>
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:6, flexShrink:0}}>
                <span style={s.escalationBadge}>🔴 IMMEDIATE ACTION</span>
                <span style={{...s.escalationBadge, background:'rgba(255,255,255,0.15)', color:'#fff', border:'1px solid rgba(255,255,255,0.3)'}}>
                  Forwarded to HOD
                </span>
              </div>
            </div>
            <div style={s.escalationList}>
              {escalated.map(c => {
                const flagIcon  = c.emotion_flag === 'crisis' ? '🆘' : c.emotion_flag === 'distress' ? '💛' : '⚠️'
                const flagColor = c.emotion_flag === 'crisis' ? '#fca5a5' : c.emotion_flag === 'distress' ? '#fed7aa' : '#fde68a'
                return (
                  <div key={c.id} style={s.escalationCard}>
                    <div style={s.escalationCardTop}>
                      <span style={{...s.escalationFlag, color: c.emotion_flag==='crisis'?'#dc2626':'#c2410c', background: c.emotion_flag==='crisis'?'#fee2e2':'#fff7ed'}}>
                        {flagIcon} {c.emotion_flag?.toUpperCase() || 'FLAGGED'}
                      </span>
                      <span style={s.escalationTicket}>{c.ticket_id}</span>
                      <span style={s.escalationStudent}>👤 {c.anonymous ? "🕵️ Anonymous" : c.user_id}</span>
                      <span style={{fontSize:11, color:flagColor, fontWeight:600}}>
                        {c.assigned_role === 'UNASSIGNED' ? '⏳ Awaiting HOD assignment' : `📤 Sent to ${c.assigned_role.replace(/_/g,' ')}`}
                      </span>
                    </div>
                    <div style={s.escalationIssue}>"{c.issue_text}"</div>
                    <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:2}}>
                      <span style={s.escalationActionChip}>
                        {!c.anonymous && `📞 Contact student · ${c.user_id}`}
                      </span>
                      {c.assigned_role === 'UNASSIGNED' && (
                        <span style={s.escalationActionChip}>⚡ Instruct HOD to assign immediately</span>
                      )}
                      <span style={s.escalationActionChip}>
                        🕐 {new Date(c.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick action bar */}
        <div style={s.quickActions}>
          <button style={s.qaBtn} onClick={exportCSV}>📥 Export CSV ({complaints.length})</button>
          <button style={s.qaBtn} onClick={() => navigate('/users')}>👥 Manage Users</button>
          <button style={s.qaBtn} onClick={() => navigate('/announce')}>📢 Announcements</button>
          <button style={s.qaBtn} onClick={() => navigate('/analytics')}>📊 Analytics</button>
        </div>

        {/* Dept chips */}
        <div style={s.chipRow}>
          {[{key:'ALL', icon:'🏫', label:'All Departments'}, ...Object.entries(DEPTS).map(([k,v])=>({key:k,...v}))].map(d => {
            const count = d.key==='ALL' ? 0 : complaints.filter(c=>c.assigned_role===d.key&&c.status==='New').length
            const active = deptFilter===d.key
            return (
              <button key={d.key} onClick={()=>setDeptFilter(d.key)}
                style={{...s.chip, ...(active?{background: dark?`rgba(0,0,0,0)`:`${DEPTS[d.key]?.bg||'#eef2ff'}`, borderColor:DEPTS[d.key]?.color||'#6366f1', color:DEPTS[d.key]?.color||'#6366f1', boxShadow: dark?`0 0 0 2px ${DEPTS[d.key]?.color||'#6366f1'}20`:undefined}:{})}}>
                {d.icon} {d.label}
                {count>0 && <span style={s.chipBadge}>{count}</span>}
              </button>
            )
          })}
        </div>

        {/* Main table card */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={s.tabGroup}>
              <button onClick={()=>setActiveTab('all')} style={{...s.tab,...(activeTab==='all'?s.tabActive:{})}}>
                📋 All Complaints <span style={s.tabCount}>{sorted.length}</span>
              </button>
              <button onClick={()=>setActiveTab('urgent')} style={{...s.tab,...(activeTab==='urgent'?s.tabUrgent:{})}}>
                🚨 Urgent <span style={{...s.tabCount,background:'#ef4444',color:'#fff'}}>{urgent.length}</span>
              </button>
            </div>
            <div style={s.filterRow}>
              <div style={s.searchBox}>
                <span>🔍</span>
                <input style={s.searchInput} placeholder="Search ticket, student, issue…" value={search} onChange={e=>setSearch(e.target.value)} />
              </div>
              <select style={s.sel} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                <option value="All">All Status</option>
                <option>New</option><option>Under Review</option><option>Resolved</option>
              </select>
            </div>
          </div>

          <div style={{overflowX:'auto', marginTop:16}}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {['AI Priority','Ticket','Student','Issue','Department','Status','Age','Action'].map(h=>(
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {display.length===0 ? (
                  <tr><td colSpan={8} style={s.emptyCell}><div style={{fontSize:40}}>📭</div><div>No complaints found</div></td></tr>
                ) : display.map((row,i) => {
                  const p    = getPriority(row)
                  const meta = DEPTS[row.assigned_role]
                  return (
                    <tr key={row.id} style={{background: p.level==='Critical'&&row.status!=='Resolved' ? (dark?'#2d0a0a':'#fff5f5') : i%2===0 ? (dark?'#161b22':'#fff') : (dark?'#1a2233':'#fafbff'), borderLeft:`3px solid ${p.level==='Critical'&&row.status!=='Resolved'?'#ef4444':'transparent'}`, borderBottom: `1px solid ${dark ? '#21262d' : '#f8fafc'}`}}>
                      <td style={s.td}><PriorityBadge priority={p} /></td>
                      <td style={s.td}><span style={s.ticketId}>{row.ticket_id}</span></td>
                      <td style={s.td}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={s.avatar}>{row.anonymous ? "🕵" : row.user_id?.[0]?.toUpperCase()}</div>
                          <span style={{fontWeight:600,color: dark ? '#e6edf3' : '#0f172a'}}>{row.anonymous ? "🕵️ Anonymous" : row.user_id}</span>
                        </div>
                      </td>
                      <td style={{...s.td,maxWidth:200}}>
                        <div style={s.issueText} title={row.issue_text}>{row.issue_text}</div>
                        <div style={s.reasonText}>⚡ {p.tag}</div>
                      </td>
                      <td style={s.td}>
                        {row.assigned_role==='UNASSIGNED'
                          ? <span style={s.pendingPill}>⏳ Pending HOD</span>
                          : meta && <span style={{...s.deptPill,background: dark?`${meta.color}22`:meta.bg,color:meta.color, border: dark?`1px solid ${meta.color}44`:'none'}}>{meta.icon} {meta.label}</span>
                        }
                      </td>
                      <td style={s.td}><StatusBadge status={row.status} /></td>
                      <td style={s.td}>
                        <AgeBadge createdAt={row.created_at} status={row.status} />
                        <div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>
                          {new Date(row.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}
                        </div>
                      </td>
                      <td style={s.td}>
                        <select style={s.actionSel} value={row.status} onChange={e=>updateStatus(row.ticket_id,e.target.value)}>
                          <option>New</option><option>Under Review</option><option>Resolved</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={s.tableFooter}>
            Showing {display.length} of {assigned.length} assigned complaints · Sorted by AI priority
          </div>
        </div>
      </div>
    </div>
  )
}

const makeStyles = (dark) => ({
  layout: { display:'flex', minHeight:'100vh', background: dark ? '#0d1117' : '#f0f2f8' },
  main:   { flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:20, paddingBottom:32, overflow:'hidden' },

  hero: { position:'relative', overflow:'hidden', padding:'36px 32px 0', background:'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)' },
  heroPattern: { position:'absolute', inset:0, opacity:0.05, backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize:'20px 20px' },
  heroBlob: { position:'absolute', right:-80, top:-80, width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(167,139,250,0.2),transparent 70%)', pointerEvents:'none' },
  heroContent: { position:'relative', zIndex:1, marginBottom:28 },
  heroSub: { color:'#c4b5fd', fontSize:11, fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', marginBottom:6 },
  heroTitle: { color:'#fff', fontSize:28, fontWeight:800, marginBottom:6 },
  heroDesc: { color:'rgba(255,255,255,0.6)', fontSize:14 },
  heroStats: { position:'relative', zIndex:1, display:'flex', gap:12, flexWrap:'wrap', paddingBottom:28 },

  aiBar: { margin:'0 32px', background: dark?'rgba(99,102,241,0.1)':'linear-gradient(90deg,#eef2ff,#f5f3ff)', border: `1px solid ${dark?'#3730a3':'#c7d2fe'}`, borderRadius:12, padding:'12px 18px', fontSize:13, fontWeight:600, color: dark?'#a5b4fc':'#4f46e5' },

  /* ── Escalation Section ── */
  escalationBox: { margin:'0 32px', background:'linear-gradient(135deg,#450a0a,#7f1d1d,#450a0a)', borderRadius:20, overflow:'hidden', boxShadow:'0 16px 48px rgba(220,38,38,0.4)', border:'1px solid rgba(239,68,68,0.3)' },
  escalationHeader: { display:'flex', alignItems:'flex-start', gap:16, padding:'22px 28px', borderBottom:'1px solid rgba(255,255,255,0.1)', flexWrap:'wrap' },
  escalationTitle: { color:'#fff', fontWeight:800, fontSize:18, marginBottom:5 },
  escalationSub: { color:'rgba(255,255,255,0.7)', fontSize:13, lineHeight:1.6 },
  escalationBadge: { background:'#ef4444', color:'#fff', fontSize:11, fontWeight:800, padding:'6px 14px', borderRadius:8, letterSpacing:'0.5px', whiteSpace:'nowrap', textAlign:'center' },
  escalationList: { display:'flex', flexDirection:'column', gap:0 },
  escalationCard: { padding:'18px 28px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', gap:10 },
  escalationCardTop: { display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' },
  escalationFlag: { fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:6, letterSpacing:'0.5px' },
  escalationTicket: { fontFamily:'monospace', fontWeight:800, color:'#fca5a5', fontSize:13, background:'rgba(255,255,255,0.1)', padding:'3px 8px', borderRadius:6 },
  escalationStudent: { color:'rgba(255,255,255,0.85)', fontSize:13, fontWeight:600 },
  escalationIssue: { color:'rgba(255,255,255,0.8)', fontSize:14, fontStyle:'italic', lineHeight:1.7, borderLeft:'3px solid rgba(239,68,68,0.5)', paddingLeft:12 },
  escalationActionChip: { fontSize:11, color:'#fde68a', fontWeight:600, background:'rgba(251,191,36,0.12)', padding:'4px 10px', borderRadius:6, border:'1px solid rgba(251,191,36,0.25)' },

  unassignedBanner: { margin:'0 32px', background:'linear-gradient(135deg,#fef9c3,#fef3c7)', border:'2px solid #fde68a', borderRadius:16, padding:'16px 22px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' },
  unassignedTitle: { fontWeight:800, color:'#78350f', fontSize:14, marginBottom:8 },
  unassignedChips: { display:'flex', gap:8, flexWrap:'wrap' },
  unassignedChip: { background:'rgba(255,255,255,0.7)', border:'1px solid #fde68a', color:'#92400e', padding:'3px 10px', borderRadius:'999px', fontSize:12, fontWeight:600 },
  unassignedNote: { fontSize:12, color:'#92400e', fontWeight:600, background:'rgba(255,255,255,0.5)', padding:'8px 14px', borderRadius:8, whiteSpace:'nowrap' },

  urgentBanner: { margin:'0 32px', background:'linear-gradient(135deg,#7f1d1d,#991b1b)', borderRadius:16, padding:'18px 22px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', boxShadow:'0 8px 24px rgba(220,38,38,0.25)' },
  urgentTitle: { color:'#fff', fontWeight:700, fontSize:14, marginBottom:8 },
  urgentChips: { display:'flex', gap:8, flexWrap:'wrap' },
  urgentChip: { background:'rgba(255,255,255,0.15)', color:'#fecaca', padding:'3px 10px', borderRadius:'999px', fontSize:12, fontWeight:500 },
  urgentBtn: { background: dark ? '#161b22' : '#fff', color:'#991b1b', border:'none', borderRadius:10, padding:'10px 20px', fontWeight:700, fontSize:13, flexShrink:0, boxShadow:'0 4px 12px rgba(0,0,0,0.2)', cursor:'pointer' },

  quickActions: { display:'flex', gap:10, padding:'0 32px', flexWrap:'wrap' },
  qaBtn: { padding:'10px 20px', background: dark ? '#161b22' : '#fff', border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, borderRadius:12, fontSize:13, fontWeight:700, color: dark ? '#c9d1d9' : '#374151', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.04)', display:'flex', alignItems:'center', gap:6 },
  chipRow: { display:'flex', gap:8, flexWrap:'wrap', padding:'0 32px' },
  chip: { display:'flex', alignItems:'center', gap:6, background: dark ? '#161b22' : '#fff', border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, borderRadius:'999px', padding:'7px 16px', fontSize:13, fontWeight:600, color: dark ? '#94a3b8' : '#475569', cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' },
  chipBadge: { background:'#ef4444', color:'#fff', borderRadius:'999px', padding:'1px 7px', fontSize:11, fontWeight:800 },

  card: { margin:'0 32px', background: dark ? '#161b22' : '#fff', borderRadius:20, padding:24, border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}`, boxShadow:'0 4px 20px rgba(0,0,0,0.06)' },
  cardHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:14, marginBottom:4 },
  tabGroup: { display:'flex', gap:8 },
  tab: { display:'flex', alignItems:'center', gap:8, padding:'9px 18px', borderRadius:10, border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, background: dark ? '#1c2333' : '#f8fafc', fontSize:14, fontWeight:600, color: dark?'#8b949e':'#64748b', cursor:'pointer' },
  tabActive: { background: dark?'rgba(99,102,241,0.2)':'#eef2ff', color: dark?'#a5b4fc':'#6366f1', borderColor: dark?'#6366f1':'#c7d2fe' },
  tabUrgent: { background: dark?'rgba(220,38,38,0.2)':'#fee2e2', color: dark?'#fca5a5':'#dc2626', borderColor: dark?'#ef4444':'#fecaca' },
  tabCount: { background: dark ? '#30363d' : '#e2e8f0', color: dark ? '#8b949e' : '#64748b', padding:'2px 8px', borderRadius:'999px', fontSize:12, fontWeight:700 },
  filterRow: { display:'flex', gap:10, flexWrap:'wrap' },
  searchBox: { display:'flex', alignItems:'center', gap:8, background: dark ? '#1c2333' : '#f8fafc', border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, borderRadius:12, padding:'0 14px', minWidth:220 },
  searchInput: { border:'none', background:'transparent', outline:'none', fontSize:13, padding:'10px 0', flex:1, color: dark ? '#e6edf3' : '#0f172a' },
  sel: { padding:'10px 14px', borderRadius:12, border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, fontSize:13, background: dark ? '#1c2333' : '#f8fafc', cursor:'pointer', fontWeight:500, color: dark?'#c9d1d9':'#374151' },

  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background: dark ? 'linear-gradient(90deg,#161b22,#1c2333)' : 'linear-gradient(90deg,#f8fafc,#f0f4ff)' },
  th: { textAlign:'left', padding:'13px 14px', fontSize:11, fontWeight:700, color: dark ? '#8b949e' : '#64748b', textTransform:'uppercase', letterSpacing:'0.8px', borderBottom: `2px solid ${dark ? '#21262d' : '#f1f5f9'}`, whiteSpace:'nowrap' },
  td: { padding:'13px 14px', fontSize:13, color: dark ? '#c9d1d9' : '#374151', verticalAlign:'middle' },
  emptyCell: { padding:'60px', textAlign:'center', color:'#94a3b8', fontSize:14 },
  ticketId: { fontFamily:'monospace', fontWeight:800, color: dark?'#a5b4fc':'#6366f1', background: dark?'rgba(99,102,241,0.15)':'#eef2ff', padding:'3px 8px', borderRadius:6, fontSize:13 },
  avatar: { width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, flexShrink:0 },
  issueText: { overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:500, marginBottom:3 },
  reasonText: { fontSize:11, color:'#94a3b8', fontStyle:'italic' },
  deptPill: { padding:'4px 10px', borderRadius:'999px', fontSize:11, fontWeight:700, whiteSpace:'nowrap' },
  pendingPill: { padding:'4px 10px', borderRadius:'999px', fontSize:11, fontWeight:700, background: dark?'rgba(251,191,36,0.12)':'#fef9c3', color: dark?'#fbbf24':'#92400e', border: `1px solid ${dark?'#92400e':'#fde68a'}` },
  actionSel: { padding:'7px 10px', borderRadius:8, border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, fontSize:12, background: dark ? '#1c2333' : '#f8fafc', cursor:'pointer', fontWeight:500, color: dark?'#c9d1d9':'#374151' },
  tableFooter: { marginTop:16, fontSize:12, color:'#94a3b8', textAlign:'right', borderTop:`1px solid ${dark?'#21262d':'#f1f5f9'}`, paddingTop:12 },
})
