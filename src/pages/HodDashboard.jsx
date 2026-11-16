import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useAIPriority } from '../hooks/useAIPriority'
import Sidebar from '../components/Sidebar'
import { useDarkMode } from '../context/DarkModeContext'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import StatCard from '../components/StatCard'
import AgeBadge from '../components/AgeBadge'

const DEPT_META = {
  IT_SUPPORT:   { icon:'💻', label:'IT Support',  color:'#6366f1', bg:'#eef2ff' },
  LAB_INCHARGE: { icon:'🧪', label:'Lab',          color:'#8b5cf6', bg:'#f5f3ff' },
  LIBRARIAN:    { icon:'📚', label:'Library',      color:'#0ea5e9', bg:'#e0f2fe' },
  TRANSPORT:    { icon:'🚌', label:'Transport',    color:'#f59e0b', bg:'#fef3c7' },
  HOSTEL:       { icon:'🏠', label:'Hostel',       color:'#10b981', bg:'#d1fae5' },
  OFFICE:       { icon:'🏢', label:'Office',       color:'#64748b', bg:'#f1f5f9' },
  FACULTY:      { icon:'👨‍🏫', label:'Faculty',     color:'#ec4899', bg:'#fce7f3' },
}

const DEPT_OPTIONS = Object.entries(DEPT_META).map(([value, meta]) => ({ value, ...meta }))

const DEPT_OPTIONS_LIST = ['IT_SUPPORT','LAB_INCHARGE','LIBRARIAN','TRANSPORT','HOSTEL','OFFICE','FACULTY']

export default function HodDashboard() {
  const { user } = useAuth()
  const { dark } = useDarkMode()
  const s = makeStyles(dark)
  const [complaints,   setComplaints]   = useState([])
  const [deptFilter,   setDeptFilter]   = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('All')
  const [search,       setSearch]       = useState('')
  const [assigning,    setAssigning]    = useState({})   // ticketId → dept being selected
  const [saving,       setSaving]       = useState(null) // ticketId being saved
  const [selected,     setSelected]     = useState([])   // bulk-selected ticket ids
  const [bulkDept,     setBulkDept]     = useState('')
  const [bulkSaving,   setBulkSaving]   = useState(false)
  const [deadlines,    setDeadlines]    = useState({})   // ticketId → deadline date
  const [reassignMap,  setReassignMap]  = useState({})   // ticketId → new dept

  const fetchComplaints = useCallback(async () => {
    const { data } = await supabase.from('complaints').select('*').order('created_at', { ascending: false })
    setComplaints(data || [])
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchComplaints()
    const sub = supabase.channel('hod-live')
      .on('postgres_changes', { event:'*', schema:'public', table:'complaints' }, fetchComplaints)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [fetchComplaints])

  // Assign a complaint to a department
  const assignDept = async (ticketId, dept) => {
    if (!dept) return
    setSaving(ticketId)
    await supabase.from('complaints')
      .update({ assigned_role: dept, status: 'Under Review' })
      .eq('ticket_id', ticketId)
    setAssigning(prev => { const n = {...prev}; delete n[ticketId]; return n })
    setSaving(null)
    fetchComplaints()
  }

  const bulkAssign = async () => {
    if (!bulkDept || !selected.length) return
    setBulkSaving(true)
    for (const ticketId of selected) {
      await supabase.from('complaints').update({ assigned_role: bulkDept, status: 'Under Review' }).eq('ticket_id', ticketId)
    }
    setSelected([]); setBulkDept(''); setBulkSaving(false); fetchComplaints()
  }

  const setDeadline = async (ticketId, date) => {
    await supabase.from('complaints').update({ deadline: date || null }).eq('ticket_id', ticketId)
    setDeadlines(d => ({...d, [ticketId]: date}))
    fetchComplaints()
  }

  const doReassign = async (ticketId, dept) => {
    if (!dept) return
    await supabase.from('complaints').update({ assigned_role: dept }).eq('ticket_id', ticketId)
    setReassignMap(m => ({...m, [ticketId]: ''}))
    fetchComplaints()
  }

  const { priorities, loading: aiLoading } = useAIPriority(complaints)
  const getPriority = c => priorities[c.ticket_id] || { level:'Low', color:'#10b981', bg:'#d1fae5', score:0, tag:'Analyzing…' }

  const pending    = complaints.filter(c => c.assigned_role === 'UNASSIGNED')
  const assigned   = complaints.filter(c => c.assigned_role !== 'UNASSIGNED')
  const urgent     = assigned.filter(c => { const p=getPriority(c); return (p.level==='Critical'||p.level==='High') && c.status!=='Resolved' })
  const escalated  = complaints.filter(c => c.escalated === true && c.status !== 'Resolved')

  const sortedAssigned = [...assigned].sort((a,b) => (getPriority(b).score||0)-(getPriority(a).score||0))

  const filtered = sortedAssigned.filter(c => {
    const matchDept   = deptFilter==='ALL' || c.assigned_role===deptFilter
    const matchStatus = statusFilter==='All' || c.status===statusFilter
    const matchSearch = !search ||
      c.ticket_id?.toLowerCase().includes(search.toLowerCase()) ||
      c.user_id?.toLowerCase().includes(search.toLowerCase()) ||
      c.issue_text?.toLowerCase().includes(search.toLowerCase())
    return matchDept && matchStatus && matchSearch
  })

  const stats = {
    total:    complaints.length,
    pending:  pending.length,
    inReview: complaints.filter(c=>c.status==='Under Review').length,
    resolved: complaints.filter(c=>c.status==='Resolved').length,
  }

  const deptCounts = Object.entries(DEPT_META).map(([key,meta]) => ({
    key, meta,
    total: assigned.filter(c=>c.assigned_role===key).length,
    newC:  assigned.filter(c=>c.assigned_role===key&&c.status==='New').length,
  }))

  return (
    <div style={s.layout}>
      <Sidebar links={[
        { to:'/hod',       icon:'📋', label:'HOD Overview' },
        { to:'/analytics', icon:'📊', label:'Analytics' },
        { to:'/announce',  icon:'📢', label:'Announcements' },
      ]} />

      <div style={s.main}>

        {/* ── Hero ── */}
        <div style={s.hero}>
          <div style={s.heroPattern} />
          <div style={s.heroContent}>
            <p style={s.heroSub}>📋 Supervisor View</p>
            <h1 style={s.heroTitle}>HOD Dashboard</h1>
            <p style={s.heroDesc}>Welcome, <strong style={{color:'#fff'}}>{user.username}</strong> · Review and assign all incoming complaints</p>
          </div>
          <div style={s.heroStats}>
            <StatCard icon="📥" label="Pending Assignment" value={stats.pending}  gradient={stats.pending>0?"linear-gradient(135deg,#dc2626,#991b1b)":"rgba(255,255,255,0.15)"} />
            <StatCard icon="📋" label="Total Received"     value={stats.total}    gradient="rgba(255,255,255,0.15)" />
            <StatCard icon="🔍" label="In Review"          value={stats.inReview} gradient="linear-gradient(135deg,#f97316,#ea580c)" />
            <StatCard icon="✅" label="Resolved"           value={stats.resolved} gradient="linear-gradient(135deg,#10b981,#059669)" />
            <StatCard icon="🚨" label="AI Urgent"          value={urgent.length}  gradient="linear-gradient(135deg,#7c3aed,#6d28d9)" />
          </div>
        </div>

        {/* ── AI Loading ── */}
        {aiLoading && <div style={s.aiBar}>🤖 AI is analyzing all complaints…</div>}

        {/* ══════════════════════════════════════
            EMOTIONAL ESCALATION ALERT
        ══════════════════════════════════════ */}
        {escalated.length > 0 && (
          <div style={s.escalationBox}>
            <div style={s.escalationHeader}>
              <span style={{fontSize:32}}>🆘</span>
              <div style={{flex:1}}>
                <div style={s.escalationTitle}>
                  Emotional Distress Alert — {escalated.length} complaint{escalated.length>1?'s':''} flagged
                </div>
                <div style={s.escalationSub}>
                  AI detected emotional distress signals. These are auto-escalated to HOD & Principal regardless of department assignment.
                </div>
              </div>
              <span style={s.escalationBadge}>NEEDS IMMEDIATE ATTENTION</span>
            </div>
            <div style={s.escalationList}>
              {escalated.map(c => {
                const flagIcon = c.emotion_flag === 'crisis' ? '🆘' : c.emotion_flag === 'distress' ? '💛' : '⚠️'
                const flagColor = c.emotion_flag === 'crisis' ? '#dc2626' : c.emotion_flag === 'distress' ? '#c2410c' : '#92400e'
                const flagBg    = c.emotion_flag === 'crisis' ? '#fee2e2' : c.emotion_flag === 'distress' ? '#fff7ed' : '#fffbeb'
                return (
                  <div key={c.id} style={{...s.escalationCard, borderLeft:`4px solid ${flagColor}`}}>
                    <div style={s.escalationCardTop}>
                      <span style={{...s.escalationFlag, color:flagColor, background:flagBg}}>
                        {flagIcon} {c.emotion_flag?.toUpperCase()}
                      </span>
                      <span style={s.escalationTicket}>{c.ticket_id}</span>
                      <span style={s.escalationStudent}>👤 {c.anonymous ? "🕵️ Anonymous" : c.user_id}</span>
                      <span style={{...s.escalationStatus, color: c.assigned_role==='UNASSIGNED'?'#92400e':'#065f46', background: c.assigned_role==='UNASSIGNED'?'#fef9c3':'#d1fae5'}}>
                        {c.assigned_role === 'UNASSIGNED' ? '⏳ Unassigned' : `✅ ${c.assigned_role.replace('_',' ')}`}
                      </span>
                    </div>
                    <div style={s.escalationIssue}>"{c.issue_text}"</div>
                    {c.assigned_role === 'UNASSIGNED' && (
                      <div style={s.escalationAction}>
                        ⚡ Assign this complaint immediately from the Pending section below
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            PENDING ASSIGNMENT — Core HOD feature
        ══════════════════════════════════════ */}
        {pending.length > 0 && (
          <div style={s.pendingSection}>
            <div style={s.pendingHeader}>
              <div>
                <div style={s.pendingTitle}>
                  📥 Pending Assignment
                  <span style={s.pendingCount}>{pending.length}</span>
                </div>
                <div style={s.pendingSub}>
                  These complaints are waiting for you to review and assign to the correct department
                </div>
              </div>
            </div>

            {/* Bulk assign toolbar */}
            {selected.length > 0 && (
              <div style={s.bulkBar}>
                <span style={s.bulkCount}>{selected.length} selected</span>
                <select style={s.bulkSel} value={bulkDept} onChange={e=>setBulkDept(e.target.value)}>
                  <option value="">— Assign all to dept —</option>
                  {DEPT_OPTIONS_LIST.map(d=><option key={d} value={d}>{d.replace(/_/g,' ')}</option>)}
                </select>
                <button style={s.bulkBtn} onClick={bulkAssign} disabled={!bulkDept||bulkSaving}>
                  {bulkSaving ? '⏳' : '✅ Bulk Assign'}
                </button>
                <button style={s.bulkCancel} onClick={() => setSelected([])}>✕ Clear</button>
              </div>
            )}
            <div style={s.pendingList}>
              {pending.map(c => {
                const p       = getPriority(c)
                const selDept = assigning[c.ticket_id] || ''
                const isSaving = saving === c.ticket_id
                return (
                  <div key={c.id} style={s.pendingCard}>
                    {/* Left strip */}
                    <div style={{ ...s.pendingStrip, background: p.level==='Critical'?'#ef4444':p.level==='High'?'#f97316':'#6366f1' }} />

                    <div style={s.pendingCardBody}>
                      {/* Top row */}
                      <div style={s.pendingCardTop}>
                        <div style={s.pendingCardLeft}>
                          <input type="checkbox" checked={selected.includes(c.ticket_id)}
                            onChange={e => setSelected(s => e.target.checked ? [...s,c.ticket_id] : s.filter(id=>id!==c.ticket_id))}
                            style={{width:16,height:16,cursor:'pointer'}} />
                          <span style={s.pendingTicketId}>{c.ticket_id}</span>
                          <PriorityBadge priority={p} />
                          <AgeBadge createdAt={c.created_at} status={c.status} />
                        </div>
                        <div style={s.pendingStudentRow}>
                          <div style={s.pendingAvatar}>{c.anonymous ? "🕵" : c.user_id?.[0]?.toUpperCase()}</div>
                          <span style={s.pendingStudent}>{c.anonymous ? "🕵️ Anonymous" : c.user_id}</span>
                        </div>
                      </div>

                      {/* Issue text */}
                      <div style={s.pendingIssue}>{c.issue_text}</div>
                      <div style={s.pendingReason}>🤖 AI insight: {p.tag}</div>

                      {/* Deadline */}
                      <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4}}>
                        <label style={{fontSize:12,fontWeight:700,color: dark ? '#c9d1d9' : '#374151'}}>📅 Deadline:</label>
                        <input type="date" style={s.dateInput}
                          value={deadlines[c.ticket_id] || (c.deadline ? c.deadline.slice(0,10) : '')}
                          onChange={e => setDeadline(c.ticket_id, e.target.value)}
                          min={new Date().toISOString().slice(0,10)} />
                        {(deadlines[c.ticket_id] || c.deadline) && (
                          <span style={{fontSize:11,color:'#0369a1',fontWeight:600}}>✓ Set</span>
                        )}
                      </div>

                      {/* Assignment row */}
                      <div style={s.assignRow}>
                        <span style={s.assignLabel}>Assign to Department:</span>
                        <select
                          style={s.assignSelect}
                          value={selDept}
                          onChange={e => setAssigning(prev => ({...prev, [c.ticket_id]: e.target.value}))}
                        >
                          <option value="">— Select Department —</option>
                          {DEPT_OPTIONS.map(d => (
                            <option key={d.value} value={d.value}>{d.icon} {d.label}</option>
                          ))}
                        </select>
                        <button
                          style={{ ...s.assignBtn, opacity: selDept && !isSaving ? 1 : 0.5 }}
                          disabled={!selDept || isSaving}
                          onClick={() => assignDept(c.ticket_id, selDept)}
                        >
                          {isSaving ? '⏳ Sending…' : '✅ Assign & Forward'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {pending.length === 0 && (
          <div style={s.allAssignedBanner}>
            ✅ All complaints have been assigned to departments — great work!
          </div>
        )}

        {/* ── Assigned Complaints (All Departments) ── */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div>
              <h3 style={s.cardTitle}>📋 Assigned Complaints Overview</h3>
              <p style={s.cardSub}>All complaints forwarded to departments · sorted by AI priority</p>
            </div>

            {/* Dept chips */}
            <div style={s.chipRow}>
              <button style={{...s.chip, ...(deptFilter==='ALL'?s.chipActive:{})}} onClick={()=>setDeptFilter('ALL')}>All</button>
              {deptCounts.filter(d=>d.total>0).map(d=>(
                <button key={d.key} style={{...s.chip, ...(deptFilter===d.key?s.chipActive:{})}} onClick={()=>setDeptFilter(d.key)}>
                  {d.meta.icon} {d.meta.label} <span style={s.chipNum}>{d.total}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={s.filterRow}>
            <div style={s.searchBox}>
              <span>🔍</span>
              <input style={s.searchInput} placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <select style={s.select} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="All">All Status</option>
              <option>New</option><option>Under Review</option><option>Resolved</option>
            </select>
          </div>

          <div style={{overflowX:'auto', marginTop:16}}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {['AI Priority','Ticket','Student','Issue','Department','Status','Age'].map(h=>(
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length===0 ? (
                  <tr><td colSpan={7} style={s.emptyCell}><div style={{fontSize:36}}>📭</div>No assigned complaints found</td></tr>
                ) : filtered.map((row,i) => {
                  const p    = getPriority(row)
                  const meta = DEPT_META[row.assigned_role]
                  return (
                    <tr key={row.id} style={{ background: i%2===0 ? (dark?'#161b22':'#fff') : (dark?'#1a2233':'#fafbff'), borderLeft:`3px solid ${p.level==='Critical'&&row.status!=='Resolved'?'#ef4444':'transparent'}`, borderBottom: `1px solid ${dark ? '#21262d' : '#f8fafc'}` }}>
                      <td style={s.td}><PriorityBadge priority={p} /></td>
                      <td style={s.td}><span style={s.ticketId}>{row.ticket_id}</span></td>
                      <td style={s.td}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={s.avatarDot}>{row.anonymous ? "🕵" : row.user_id?.[0]?.toUpperCase()}</div>
                          <span style={{fontWeight:600,color: dark ? '#e6edf3' : '#0f172a'}}>{row.anonymous ? "🕵️ Anonymous" : row.user_id}</span>
                        </div>
                      </td>
                      <td style={{...s.td,maxWidth:220}}>
                        <div style={s.issueText} title={row.issue_text}>{row.issue_text}</div>
                        <div style={s.reasonText}>⚡ {p.tag}</div>
                      </td>
                      <td style={s.td}>
                        {meta && <span style={{...s.deptPill, background: dark?`${meta.color}22`:meta.bg, color:meta.color, border: dark?`1px solid ${meta.color}44`:'none'}}>{meta.icon} {meta.label}</span>}
                        <div style={{marginTop:4}}>
                          <select style={{fontSize:11,padding:'2px 6px',borderRadius:6,border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}`,background: dark ? '#1c2333' : '#f8fafc',cursor:'pointer',color: dark?'#c9d1d9':'#374151'}}
                            value={reassignMap[row.ticket_id]||''}
                            onChange={e => { setReassignMap(m=>({...m,[row.ticket_id]:e.target.value})); if(e.target.value) doReassign(row.ticket_id, e.target.value) }}>
                            <option value="">↪ Reassign…</option>
                            {DEPT_OPTIONS_LIST.map(d=><option key={d} value={d}>{d.replace(/_/g,' ')}</option>)}
                          </select>
                        </div>
                      </td>
                      <td style={s.td}><StatusBadge status={row.status} /></td>
                      <td style={s.td}><AgeBadge createdAt={row.created_at} status={row.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={s.tableFooter}>
            HOD view · {filtered.length} complaints · Read-only for assigned — contact dept staff to update status
          </div>
        </div>

      </div>
    </div>
  )
}

const makeStyles = (dark) => ({
  layout: { display:'flex', minHeight:'100vh', background: dark ? '#0d1117' : '#f0f2f8' },
  main:   { flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:20, paddingBottom:32, overflow:'hidden' },

  hero: { position:'relative', overflow:'hidden', padding:'36px 32px 0', background:'linear-gradient(135deg,#164e63,#0e7490,#155e75)' },
  heroPattern: { position:'absolute', inset:0, opacity:0.05, backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize:'20px 20px' },
  heroContent: { position:'relative', zIndex:1, marginBottom:24 },
  heroSub: { color:'#a5f3fc', fontSize:11, fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', marginBottom:6 },
  heroTitle: { color:'#fff', fontSize:28, fontWeight:800, marginBottom:6 },
  heroDesc: { color:'rgba(255,255,255,0.7)', fontSize:14 },
  heroStats: { position:'relative', zIndex:1, display:'flex', gap:12, flexWrap:'wrap', paddingBottom:28 },

  aiBar: { margin:'0 32px', background: dark?'rgba(14,165,233,0.08)':'linear-gradient(90deg,#e0f2fe,#ecfeff)', border: `1px solid ${dark?'#0e7490':'#7dd3fc'}`, borderRadius:12, padding:'12px 18px', fontSize:13, fontWeight:600, color: dark?'#38bdf8':'#0369a1' },

  /* ── Escalation Alert ── */
  escalationBox: { margin:'0 32px', background:'linear-gradient(135deg,#7f1d1d,#991b1b,#7c2d12)', borderRadius:20, overflow:'hidden', boxShadow:'0 12px 40px rgba(220,38,38,0.35)' },
  escalationHeader: { display:'flex', alignItems:'flex-start', gap:16, padding:'20px 24px', borderBottom:'1px solid rgba(255,255,255,0.1)', flexWrap:'wrap' },
  escalationTitle: { color:'#fff', fontWeight:800, fontSize:17, marginBottom:4 },
  escalationSub: { color:'rgba(255,255,255,0.7)', fontSize:13, lineHeight:1.5 },
  escalationBadge: { background: dark ? '#161b22' : '#fff', color:'#991b1b', fontSize:11, fontWeight:800, padding:'6px 14px', borderRadius:8, flexShrink:0, alignSelf:'flex-start', letterSpacing:'0.5px' },
  escalationList: { display:'flex', flexDirection:'column', gap:0 },
  escalationCard: { background:'rgba(255,255,255,0.06)', padding:'16px 24px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', flexDirection:'column', gap:8 },
  escalationCardTop: { display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' },
  escalationFlag: { fontSize:11, fontWeight:800, padding:'3px 10px', borderRadius:6, letterSpacing:'0.5px' },
  escalationTicket: { fontFamily:'monospace', fontWeight:800, color:'#fca5a5', fontSize:13, background:'rgba(255,255,255,0.1)', padding:'3px 8px', borderRadius:6 },
  escalationStudent: { color:'rgba(255,255,255,0.8)', fontSize:13, fontWeight:600 },
  escalationStatus: { fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:'999px' },
  escalationIssue: { color:'rgba(255,255,255,0.85)', fontSize:14, fontStyle:'italic', lineHeight:1.6, paddingLeft:4 },
  escalationAction: { fontSize:12, color:'#fde68a', fontWeight:600, background:'rgba(251,191,36,0.15)', padding:'6px 12px', borderRadius:8, border:'1px solid rgba(251,191,36,0.3)' },

  /* ── Pending Section ── */
  pendingSection: { margin:'0 32px', background: dark ? '#161b22' : '#fff', borderRadius:20, border:'2px solid #fde68a', boxShadow:'0 8px 32px rgba(251,191,36,0.15)', overflow:'hidden' },
  pendingHeader: { background:'linear-gradient(135deg,#fef9c3,#fef3c7)', padding:'20px 24px', borderBottom:'1px solid #fde68a', display:'flex', alignItems:'center', justifyContent:'space-between' },
  pendingTitle: { display:'flex', alignItems:'center', gap:10, fontSize:18, fontWeight:800, color:'#78350f' },
  pendingCount: { background:'#f59e0b', color:'#fff', borderRadius:'999px', padding:'2px 12px', fontSize:14, fontWeight:800 },
  pendingSub: { color:'#92400e', fontSize:13, marginTop:4 },
  pendingList: { display:'flex', flexDirection:'column', gap:0 },

  pendingCard: { display:'flex', borderBottom:'1px solid #fef3c7', transition:'background 0.15s' },
  pendingStrip: { width:5, flexShrink:0 },
  pendingCardBody: { flex:1, padding:'20px 24px', display:'flex', flexDirection:'column', gap:10 },
  pendingCardTop: { display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 },
  pendingCardLeft: { display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' },
  pendingTicketId: { fontFamily:'monospace', fontWeight:800, color: dark?'#38bdf8':'#0369a1', background: dark?'rgba(14,165,233,0.15)':'#ecfeff', padding:'3px 10px', borderRadius:6, fontSize:13 },
  pendingStudentRow: { display:'flex', alignItems:'center', gap:8 },
  pendingAvatar: { width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:14, flexShrink:0 },
  pendingStudent: { fontWeight:700, color: dark ? '#e6edf3' : '#0f172a', fontSize:14 },
  pendingIssue: { fontSize:15, color: dark ? '#e6edf3' : '#1e293b', fontWeight:500, lineHeight:1.6 },
  pendingReason: { fontSize:12, color: dark?'#fbbf24':'#92400e', background: dark?'rgba(251,191,36,0.1)':'#fef9c3', padding:'4px 10px', borderRadius:8, fontWeight:500, alignSelf:'flex-start' },

  assignRow: { display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', background: dark ? '#1c2333' : '#f8fafc', borderRadius:10, padding:'12px 16px', border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}`, marginTop:4 },
  assignLabel: { fontSize:13, fontWeight:700, color: dark ? '#c9d1d9' : '#374151', whiteSpace:'nowrap' },
  assignSelect: { flex:1, minWidth:200, padding:'9px 14px', borderRadius:10, border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, fontSize:14, background: dark ? '#161b22' : '#fff', cursor:'pointer', fontWeight:500, color: dark?'#e6edf3':'#0f172a' },
  assignBtn: { padding:'10px 24px', background:'linear-gradient(135deg,#0ea5e9,#0284c7)', color:'#fff', border:'none', borderRadius:10, fontWeight:800, fontSize:14, cursor:'pointer', flexShrink:0, boxShadow:'0 4px 12px rgba(14,165,233,0.35)', whiteSpace:'nowrap' },

  allAssignedBanner: { margin:'0 32px', background:'linear-gradient(135deg,#d1fae5,#a7f3d0)', border:'2px solid #6ee7b7', borderRadius:14, padding:'16px 24px', fontSize:14, fontWeight:600, color:'#065f46' },

  bulkBar: { display:'flex', alignItems:'center', gap:10, padding:'12px 20px', background:'linear-gradient(90deg,#eef2ff,#f5f3ff)', borderBottom:'1px solid #c7d2fe', flexWrap:'wrap' },
  bulkCount: { fontSize:13, fontWeight:800, color:'#6366f1', background: dark ? '#161b22' : '#fff', padding:'4px 12px', borderRadius:8, border:'1px solid #c7d2fe' },
  bulkSel: { flex:1, minWidth:180, padding:'8px 12px', borderRadius:8, border:'2px solid #c7d2fe', fontSize:13, background: dark ? '#161b22' : '#fff', cursor:'pointer', color: dark?'#e6edf3':'#0f172a' },
  bulkBtn: { padding:'8px 18px', background:'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' },
  bulkCancel: { padding:'8px 14px', background: dark ? '#1c2333' : '#f1f5f9', color: dark ? '#94a3b8' : '#475569', border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}`, borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer' },
  dateInput: { padding:'5px 10px', borderRadius:8, border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, fontSize:12, background: dark ? '#1c2333' : '#f8fafc', cursor:'pointer', color: dark?'#c9d1d9':'#374151' },
  /* Card */
  card: { margin:'0 32px', background: dark ? '#161b22' : '#fff', borderRadius:20, padding:24, border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}`, boxShadow:'0 4px 20px rgba(0,0,0,0.06)' },
  cardHeader: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16, marginBottom:14 },
  cardTitle: { fontSize:16, fontWeight:800, color: dark ? '#e6edf3' : '#0f172a', marginBottom:2 },
  cardSub: { fontSize:13, color: dark ? '#8b949e' : '#64748b' },
  chipRow: { display:'flex', gap:6, flexWrap:'wrap' },
  chip: { display:'flex', alignItems:'center', gap:5, background: dark ? '#1c2333' : '#f8fafc', border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, borderRadius:'999px', padding:'5px 12px', fontSize:12, fontWeight:600, color: dark ? '#94a3b8' : '#475569', cursor:'pointer' },
  chipActive: { background: dark?'rgba(14,165,233,0.15)':'#ecfeff', border: `2px solid ${dark?'#0e7490':'#67e8f9'}`, color: dark?'#38bdf8':'#0e7490' },
  chipNum: { background: dark?'#21262d':'#e2e8f0', color: dark?'#8b949e':'#475569', borderRadius:'999px', padding:'0 6px', fontSize:11, fontWeight:800 },
  filterRow: { display:'flex', gap:10, marginBottom:4 },
  searchBox: { display:'flex', alignItems:'center', gap:8, background: dark ? '#1c2333' : '#f8fafc', border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, borderRadius:12, padding:'0 14px', flex:1, maxWidth:300 },
  searchInput: { border:'none', background:'transparent', outline:'none', fontSize:13, padding:'9px 0', flex:1, color: dark?'#e6edf3':'#0f172a' },
  select: { padding:'9px 12px', borderRadius:10, border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, fontSize:13, background: dark ? '#1c2333' : '#f8fafc', cursor:'pointer', fontWeight:500, color: dark?'#c9d1d9':'#374151' },

  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background: dark ? 'linear-gradient(90deg,#161b22,#1c2333)' : 'linear-gradient(90deg,#f8fafc,#ecfeff)' },
  th: { textAlign:'left', padding:'12px 14px', fontSize:11, fontWeight:700, color: dark ? '#8b949e' : '#64748b', textTransform:'uppercase', letterSpacing:'0.8px', borderBottom: `2px solid ${dark ? '#21262d' : '#f1f5f9'}`, whiteSpace:'nowrap' },
  td: { padding:'13px 14px', fontSize:13, color: dark ? '#c9d1d9' : '#374151', verticalAlign:'middle' },
  emptyCell: { padding:'50px', textAlign:'center', color:'#94a3b8', fontSize:14, display:'flex', flexDirection:'column', alignItems:'center', gap:8 },
  ticketId: { fontFamily:'monospace', fontWeight:800, color: dark?'#38bdf8':'#0e7490', background: dark?'rgba(14,165,233,0.15)':'#ecfeff', padding:'3px 8px', borderRadius:6, fontSize:13 },
  avatarDot: { width:28, height:28, borderRadius:7, background:'linear-gradient(135deg,#0ea5e9,#0284c7)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, flexShrink:0 },
  issueText: { overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:500, marginBottom:3 },
  reasonText: { fontSize:11, color:'#94a3b8', fontStyle:'italic' },
  deptPill: { padding:'4px 10px', borderRadius:'999px', fontSize:11, fontWeight:700, whiteSpace:'nowrap' },
  tableFooter: { marginTop:16, fontSize:12, color:'#94a3b8', textAlign:'center', padding:10, background: dark ? '#1c2333' : '#f8fafc', borderRadius:10, border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}` },
})
