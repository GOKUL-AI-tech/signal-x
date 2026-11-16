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
  IT_SUPPORT:   { icon:'💻', label:'IT Support',   grad:'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#6366f1', bg:'#eef2ff' },
  LAB_INCHARGE: { icon:'🧪', label:'Lab Incharge',  grad:'linear-gradient(135deg,#8b5cf6,#7c3aed)', color:'#8b5cf6', bg:'#f5f3ff' },
  LIBRARIAN:    { icon:'📚', label:'Library',        grad:'linear-gradient(135deg,#0ea5e9,#0284c7)', color:'#0ea5e9', bg:'#e0f2fe' },
  TRANSPORT:    { icon:'🚌', label:'Transport',      grad:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#f59e0b', bg:'#fef3c7' },
  HOSTEL:       { icon:'🏠', label:'Hostel',         grad:'linear-gradient(135deg,#10b981,#059669)', color:'#10b981', bg:'#d1fae5' },
  OFFICE:       { icon:'🏢', label:'Office',         grad:'linear-gradient(135deg,#64748b,#475569)', color:'#64748b', bg:'#f1f5f9' },
  FACULTY:      { icon:'👨‍🏫', label:'Faculty',       grad:'linear-gradient(135deg,#ec4899,#db2777)', color:'#ec4899', bg:'#fce7f3' },
}

const DEPTS = ['IT_SUPPORT','LAB_INCHARGE','LIBRARIAN','TRANSPORT','HOSTEL','OFFICE','FACULTY']

export default function StaffDashboard() {
  const { user } = useAuth()
  const { dark } = useDarkMode()
  const s = makeStyles(dark)
  const ms = makeModalStyles(dark)
  const [complaints, setComplaints] = useState([])
  const [statusFilter, setStatusFilter] = useState('All')
  const [resolveTarget, setResolveTarget] = useState(null) // ticket being resolved
  const [resolveNote, setResolveNote]     = useState('')
  const [aiSuggestion, setAiSuggestion]   = useState({})  // ticketId → suggestion text
  const [aiLoading2, setAiLoading2]       = useState(null)
  const [reassignTarget, setReassignTarget] = useState(null)
  const [reassignDept, setReassignDept]   = useState('')

  const dept = user.department || 'FACULTY'
  const meta = DEPT_META[dept] || DEPT_META.FACULTY

  const fetchComplaints = useCallback(async () => {
    const { data } = await supabase.from('complaints').select('*').eq('assigned_role', dept).order('created_at', { ascending: false })
    setComplaints(data || [])
  }, [dept])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchComplaints()
    const sub = supabase.channel('staff-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, fetchComplaints)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [fetchComplaints])

  const openResolve = (ticketId) => { setResolveTarget(ticketId); setResolveNote('') }

  const updateStatus = async (ticketId, newStatus) => {
    if (newStatus === 'Resolved' && !resolveNote.trim()) {
      openResolve(ticketId); return
    }
    const patch = { status: newStatus }
    if (newStatus === 'Resolved') { patch.resolution_note = resolveNote; patch.resolved_at = new Date().toISOString() }
    await supabase.from('complaints').update(patch).eq('ticket_id', ticketId)
    setResolveTarget(null); setResolveNote(''); fetchComplaints()
  }

  const getAISuggestion = async (c) => {
    setAiLoading2(c.ticket_id)
    const apiKey = import.meta.env.VITE_GROQ_API_KEY
    if (!apiKey || apiKey === 'your-groq-api-key-here') {
      setAiSuggestion(s => ({...s, [c.ticket_id]: 'Please check the issue directly and respond to the student within 24 hours.'}))
      setAiLoading2(null); return
    }
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},
        body: JSON.stringify({ model:'llama-3.1-8b-instant', temperature:0.3, max_tokens:150,
          messages:[{ role:'user', content:`You are a college staff member. A student complaint: "${c.issue_text}". Give a short, actionable resolution suggestion in 2-3 sentences. Be direct and practical.` }] })
      })
      const data = await res.json()
      setAiSuggestion(s => ({...s, [c.ticket_id]: data.choices?.[0]?.message?.content || 'Unable to generate suggestion.'}))
    } catch {
      setAiSuggestion(s => ({...s, [c.ticket_id]: 'Check the issue directly and update the student within 24 hours.'}))
    }
    setAiLoading2(null)
  }

  const doReassign = async () => {
    if (!reassignDept) return
    await supabase.from('complaints').update({ assigned_role: reassignDept }).eq('ticket_id', reassignTarget)
    setReassignTarget(null); setReassignDept(''); fetchComplaints()
  }

  const { priorities, loading: aiLoading } = useAIPriority(complaints)
  const getPriority = c => priorities[c.ticket_id] || { level:'Low', color:'#10b981', bg:'#d1fae5', score:0, tag:'Analyzing…' }

  const sorted   = [...complaints].sort((a,b) => (getPriority(b).score||0)-(getPriority(a).score||0))
  const filtered = statusFilter==='All' ? sorted : sorted.filter(c => c.status===statusFilter)
  const urgent   = sorted.filter(c => { const p=getPriority(c); return (p.level==='Critical'||p.level==='High') && c.status!=='Resolved' })

  const stats = {
    total: complaints.length,
    new: complaints.filter(c=>c.status==='New').length,
    inReview: complaints.filter(c=>c.status==='Under Review').length,
    resolved: complaints.filter(c=>c.status==='Resolved').length,
  }

  return (
    <div style={s.layout}>
      <Sidebar links={[
        { to:'/staff',    icon:'🏠', label:'My Dashboard' },
        { to:'/announce', icon:'📢', label:'Announcements' },
      ]} />

      <div style={s.main}>
        {/* ── Hero ── */}
        <div style={{ ...s.hero, background: `linear-gradient(135deg, ${meta.color}cc 0%, ${meta.color}99 100%), linear-gradient(135deg,#1e1b4b,#312e81)` }}>
          <div style={s.heroPattern} />
          <div style={s.heroContent}>
            <div style={s.heroLeft}>
              <div style={{ ...s.deptBigIcon, background:'rgba(255,255,255,0.15)' }}>{meta.icon}</div>
              <div>
                <p style={s.heroSub}>{user.role} · {dept.replace('_',' ')}</p>
                <h1 style={s.heroTitle}>{meta.label} Dashboard</h1>
                <p style={s.heroDesc}>Welcome, <strong style={{color:'#fff'}}>{user.username}</strong></p>
              </div>
            </div>
            <div style={s.heroBadge}>{meta.icon} {user.role}</div>
          </div>
          <div style={s.heroStats}>
            <StatCard icon="📋" label="Total"     value={stats.total}    gradient="rgba(255,255,255,0.15)" />
            <StatCard icon="🔔" label="New"        value={stats.new}      gradient="linear-gradient(135deg,#ef4444,#dc2626)" />
            <StatCard icon="🔍" label="In Review"  value={stats.inReview} gradient="linear-gradient(135deg,#f97316,#ea580c)" />
            <StatCard icon="✅" label="Resolved"   value={stats.resolved} gradient="linear-gradient(135deg,#10b981,#059669)" />
          </div>
        </div>

        {/* ── AI loading ── */}
        {aiLoading && <div style={s.aiBar}>🤖 AI is reading and understanding each complaint…</div>}

        {/* ── Urgent alert ── */}
        {urgent.length > 0 && (
          <div style={s.urgentBox}>
            <div style={s.urgentHeader}>
              <span style={{fontSize:22}}>🚨</span>
              <div>
                <div style={s.urgentTitle}>AI Priority Alert — {urgent.length} complaint{urgent.length>1?'s':''} need urgent attention</div>
                <div style={s.urgentList}>
                  {urgent.map(c => {
                    const p = getPriority(c)
                    return (
                      <div key={c.id} style={s.urgentItem}>
                        <PriorityBadge priority={p} />
                        <span style={s.urgentTicket}>{c.ticket_id}</span>
                        <span style={s.urgentIssue}>{c.issue_text.slice(0,70)}{c.issue_text.length>70?'…':''}</span>
                        <span style={s.urgentReason}>({p.tag})</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Table card ── */}
        <div style={s.card}>
          <div style={s.cardTop}>
            <div>
              <h3 style={s.cardTitle}>Complaints — AI Priority Order</h3>
              <p style={s.cardSub}>Only complaints assigned to {meta.label} · Status updates visible to HOD & Principal</p>
            </div>
            <div style={s.tabs}>
              {['All','New','Under Review','Resolved'].map(t => (
                <button key={t} onClick={() => setStatusFilter(t)}
                  style={{ ...s.tab, ...(statusFilter===t ? s.tabActive : {}) }}>
                  {t}
                  {t==='New' && stats.new>0 && <span style={s.tabBadge}>{stats.new}</span>}
                </button>
              ))}
            </div>
          </div>

          <div style={{overflowX:'auto', marginTop:16}}>
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  {['AI Priority','Ticket','Student','Issue','Status','Age','Update'].map(h=>(
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length===0 ? (
                  <tr><td colSpan={7} style={s.empty}><div style={{fontSize:40,marginBottom:8}}>📭</div>No complaints in this category</td></tr>
                ) : filtered.map((row,i) => {
                  const p = getPriority(row)
                  const isCrit = p.level==='Critical' && row.status!=='Resolved'
                  return (
                    <tr key={row.id} style={{ ...s.tr, background: row.escalated?(dark?'#2d0a0a':'#fff0f0'):isCrit?(dark?'#2d1a0a':'#fff5f5'):i%2===0?(dark?'#161b22':'#fff'):(dark?'#1a2233':'#fafbff'), borderLeft:`4px solid ${row.escalated?'#dc2626':isCrit?'#ef4444':'transparent'}` }}>
                      <td style={s.td}><PriorityBadge priority={p} /></td>
                      <td style={s.td}><span style={s.ticketId}>{row.ticket_id}</span></td>
                      <td style={s.td}>
                        <div style={s.studentRow}>
                          <div style={{...s.avatar, background: meta.grad}}>{row.anonymous ? '🕵' : row.user_id?.[0]?.toUpperCase()}</div>
                          <span style={s.studentName}>{row.anonymous ? '🕵️ Anonymous' : row.user_id}</span>
                        </div>
                      </td>
                      <td style={{...s.td, maxWidth:220}}>
                        <div style={s.issueText} title={row.issue_text}>{row.issue_text}</div>
                        <div style={s.reasonText}>⚡ {p.tag}</div>
                        {row.escalated && (
                          <div style={s.escalatedTag}>
                            {row.emotion_flag==='crisis'?'🆘':'💛'} Emotional Distress — HOD & Principal notified
                          </div>
                        )}
                      </td>
                      <td style={s.td}><StatusBadge status={row.status} /></td>
                      <td style={s.td}>
                        <AgeBadge createdAt={row.created_at} status={row.status} />
                      </td>
                      <td style={s.td}>
                        <div style={{display:'flex',flexDirection:'column',gap:4}}>
                          <select style={s.actionSel} value={row.status} onChange={e=>updateStatus(row.ticket_id,e.target.value)}>
                            <option>New</option><option>Under Review</option><option>Resolved</option>
                          </select>
                          <div style={{display:'flex',gap:4}}>
                            <button style={s.aiBtn} onClick={() => getAISuggestion(row)} disabled={aiLoading2===row.ticket_id}>
                              {aiLoading2===row.ticket_id ? '⏳' : '🤖 Suggest'}
                            </button>
                            <button style={s.reassignBtn} onClick={() => { setReassignTarget(row.ticket_id); setReassignDept('') }}>↪ Move</button>
                          </div>
                          {aiSuggestion[row.ticket_id] && (
                            <div style={s.aiSuggestBox}>{aiSuggestion[row.ticket_id]}</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={s.tableFooter}>{filtered.length} complaints · HOD & Principal receive a copy of all complaints</div>
        </div>
      </div>
    {/* Resolution Note Modal */}
      {resolveTarget && (
        <div style={ms.overlay}>
          <div style={ms.modal}>
            <div style={{fontSize:28,marginBottom:8}}>✅</div>
            <div style={ms.title}>Resolution Note</div>
            <div style={ms.sub}>Briefly describe what action was taken before marking resolved.</div>
            <textarea style={ms.ta} rows={4} placeholder="e.g. Reset the router. WiFi restored in Block C." value={resolveNote} onChange={e=>setResolveNote(e.target.value)} />
            <div style={{display:'flex',gap:10,marginTop:14}}>
              <button style={ms.confirmBtn} onClick={() => updateStatus(resolveTarget,'Resolved')} disabled={!resolveNote.trim()}>✅ Resolve</button>
              <button style={ms.cancelBtn} onClick={() => setResolveTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Reassign Modal */}
      {reassignTarget && (
        <div style={ms.overlay}>
          <div style={ms.modal}>
            <div style={{fontSize:28,marginBottom:8}}>↪️</div>
            <div style={ms.title}>Reassign Complaint</div>
            <select style={{...ms.ta,height:'auto',padding:'10px'}} value={reassignDept} onChange={e=>setReassignDept(e.target.value)}>
              <option value="">— Select Department —</option>
              {DEPTS.map(d=><option key={d} value={d}>{d.replace(/_/g,' ')}</option>)}
            </select>
            <div style={{display:'flex',gap:10,marginTop:12}}>
              <button style={ms.confirmBtn} onClick={doReassign} disabled={!reassignDept}>Reassign</button>
              <button style={ms.cancelBtn} onClick={() => setReassignTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const makeModalStyles = (dark) => ({
  overlay: {position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000},
  modal: {background: dark ? '#161b22' : '#fff',borderRadius:20,padding:28,maxWidth:400,width:'90%',textAlign:'center',boxShadow:'0 24px 64px rgba(0,0,0,0.2)'},
  title: {fontSize:17,fontWeight:800,color: dark ? '#e6edf3' : '#0f172a',marginBottom:6},
  sub: {fontSize:13,color: dark ? '#8b949e' : '#64748b',marginBottom:14},
  ta: {width:'100%',padding:'10px',borderRadius:10,border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`,fontSize:13,resize:'vertical',outline:'none',boxSizing:'border-box',fontFamily:'inherit', background: dark?'#1c2333':'#f8fafc', color: dark?'#e6edf3':'#0f172a'},
  confirmBtn: {flex:1,padding:'11px',background:'linear-gradient(135deg,#10b981,#059669)',color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer'},
  cancelBtn: {flex:1,padding:'11px',background: dark ? '#1c2333' : '#f1f5f9',color: dark ? '#94a3b8' : '#475569',border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`,borderRadius:10,fontSize:14,fontWeight:600,cursor:'pointer'},
})

const makeStyles = (dark) => ({
  layout: { display:'flex', minHeight:'100vh', background: dark ? '#0d1117' : '#f0f2f8' },
  main:   { flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:'20px', paddingBottom:32, overflow:'hidden' },
  hero: { position:'relative', overflow:'hidden', padding:'36px 32px 0' },
  heroPattern: { position:'absolute', inset:0, opacity:0.05, backgroundImage:'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize:'20px 20px' },
  heroContent: { position:'relative', zIndex:1, display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 },
  heroLeft: { display:'flex', alignItems:'center', gap:16 },
  deptBigIcon: { width:64, height:64, borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, flexShrink:0, boxShadow:'0 8px 24px rgba(0,0,0,0.2)', border:'1px solid rgba(255,255,255,0.2)' },
  heroSub: { color:'rgba(255,255,255,0.6)', fontSize:11, fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', marginBottom:4 },
  heroTitle: { color:'#fff', fontSize:26, fontWeight:800, marginBottom:4 },
  heroDesc: { color:'rgba(255,255,255,0.7)', fontSize:14 },
  heroBadge: { background:'rgba(255,255,255,0.15)', color:'#fff', padding:'8px 18px', borderRadius:'999px', fontSize:13, fontWeight:600, border:'1px solid rgba(255,255,255,0.2)', backdropFilter:'blur(10px)', alignSelf:'flex-start' },
  heroStats: { position:'relative', zIndex:1, display:'flex', gap:12, flexWrap:'wrap', paddingBottom:28 },
  aiBar: { margin:'0 32px', background: dark?'rgba(99,102,241,0.1)':'linear-gradient(90deg,#eef2ff,#f5f3ff)', border: `1px solid ${dark?'#3730a3':'#c7d2fe'}`, borderRadius:12, padding:'12px 18px', fontSize:13, fontWeight:600, color: dark?'#a5b4fc':'#4f46e5' },
  urgentBox: { margin:'0 32px', background: dark?'rgba(251,191,36,0.08)':'#fffbeb', border: `2px solid ${dark?'#b45309':'#fde68a'}`, borderRadius:16, padding:'20px 24px' },
  urgentHeader: { display:'flex', gap:14, alignItems:'flex-start' },
  urgentTitle: { fontWeight:700, color: dark?'#fbbf24':'#92400e', fontSize:15, marginBottom:10 },
  urgentList: { display:'flex', flexDirection:'column', gap:8 },
  urgentItem: { display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' },
  urgentTicket: { fontFamily:'monospace', fontWeight:800, color:'#6366f1', fontSize:12 },
  urgentIssue: { color: dark ? '#c9d1d9' : '#374151', fontSize:12, flex:1 },
  urgentReason: { color:'#b45309', fontSize:11, fontStyle:'italic' },
  card: { margin:'0 32px', background: dark ? '#161b22' : '#fff', borderRadius:20, padding:24, border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}`, boxShadow:'0 4px 20px rgba(0,0,0,0.06)' },
  cardTop: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16 },
  cardTitle: { fontSize:16, fontWeight:700, color: dark ? '#e6edf3' : '#0f172a', marginBottom:2 },
  cardSub: { fontSize:13, color: dark ? '#8b949e' : '#64748b' },
  tabs: { display:'flex', gap:6, background: dark ? '#1c2333' : '#f1f5f9', padding:4, borderRadius:12 },
  tab: { padding:'7px 14px', borderRadius:9, border:'none', background:'transparent', fontSize:13, fontWeight:600, color: dark ? '#8b949e' : '#64748b', display:'flex', alignItems:'center', gap:6, cursor:'pointer' },
  tabActive: { background: dark ? '#161b22' : '#fff', color: dark ? '#e6edf3' : '#0f172a', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' },
  tabBadge: { background:'#ef4444', color:'#fff', borderRadius:'999px', padding:'1px 7px', fontSize:11, fontWeight:800 },
  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background: dark ? 'linear-gradient(90deg,#161b22,#1c2333)' : 'linear-gradient(90deg,#f8fafc,#f0f4ff)' },
  th: { textAlign:'left', padding:'13px 14px', fontSize:11, fontWeight:700, color: dark?'#8b949e':'#64748b', textTransform:'uppercase', letterSpacing:'0.8px', borderBottom: `2px solid ${dark ? '#21262d' : '#f1f5f9'}`, whiteSpace:'nowrap' },
  tr: { borderBottom: `1px solid ${dark ? '#21262d' : '#f8fafc'}`, transition:'background 0.15s' },
  td: { padding:'14px', fontSize:13, color: dark ? '#c9d1d9' : '#374151', verticalAlign:'middle' },
  empty: { padding:'60px', textAlign:'center', color:'#94a3b8', fontSize:14 },
  ticketId: { fontFamily:'monospace', fontWeight:800, color: dark?'#a5b4fc':'#6366f1', background: dark?'rgba(99,102,241,0.15)':'#eef2ff', padding:'3px 8px', borderRadius:6, fontSize:13 },
  studentRow: { display:'flex', alignItems:'center', gap:8 },
  avatar: { width:30, height:30, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, color:'#fff', flexShrink:0 },
  studentName: { fontWeight:600, color: dark ? '#e6edf3' : '#0f172a' },
  issueText: { overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:500, marginBottom:3 },
  reasonText: { fontSize:11, color:'#94a3b8', fontStyle:'italic' },
  escalatedTag: { fontSize:11, color: dark?'#fca5a5':'#991b1b', background: dark?'rgba(220,38,38,0.15)':'#fee2e2', border: `1px solid ${dark?'#ef4444':'#fca5a5'}`, padding:'2px 8px', borderRadius:6, fontWeight:700, marginTop:3, display:'inline-block' },
  actionSel: { padding:'7px 10px', borderRadius:8, border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, fontSize:12, background: dark ? '#1c2333' : '#f8fafc', cursor:'pointer', fontWeight:500, color: dark?'#c9d1d9':'#374151' },
  aiBtn: { flex:1, fontSize:11, fontWeight:700, color: dark?'#a5b4fc':'#6366f1', background: dark?'rgba(99,102,241,0.12)':'#eef2ff', border:'1px solid #c7d2fe', borderRadius:6, padding:'3px 6px', cursor:'pointer' },
  reassignBtn: { fontSize:11, fontWeight:700, color: dark?'#38bdf8':'#0369a1', background: dark?'rgba(14,165,233,0.12)':'#e0f2fe', border:'1px solid #7dd3fc', borderRadius:6, padding:'3px 6px', cursor:'pointer' },
  aiSuggestBox: { fontSize:11, color: dark ? '#c9d1d9' : '#374151', background: dark ? '#1c2333' : '#f8fafc', border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}`, borderRadius:6, padding:'6px 8px', lineHeight:1.5, marginTop:2 },
  tableFooter: { marginTop:16, fontSize:12, color:'#94a3b8', textAlign:'right', borderTop: `1px solid ${dark ? '#21262d' : '#f1f5f9'}`, paddingTop:12 },
})
