import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useAIPriority } from '../hooks/useAIPriority'
import Sidebar from '../components/Sidebar'
import { useDarkMode } from '../context/DarkModeContext'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import AgeBadge from '../components/AgeBadge'

const DEPT_ICONS = {
  IT_SUPPORT: '💻', LAB_INCHARGE: '🧪', LIBRARIAN: '📚',
  TRANSPORT: '🚌', HOSTEL: '🏠', OFFICE: '🏢', FACULTY: '👨‍🏫',
}
const DEPT_LABELS = {
  IT_SUPPORT: 'IT Support', LAB_INCHARGE: 'Lab', LIBRARIAN: 'Library',
  TRANSPORT: 'Transport', HOSTEL: 'Hostel', OFFICE: 'Office', FACULTY: 'Faculty',
}

export default function MyComplaints() {
  const { user } = useAuth()
  const { dark } = useDarkMode()
  const s = makeStyles(dark)
  const [complaints, setComplaints]     = useState([])
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch]             = useState('')
  const [sortBy, setSortBy]             = useState('newest') // 'newest' | 'priority'
  const [ratingTarget, setRatingTarget] = useState(null)   // complaint being rated
  const [ratingVal, setRatingVal]       = useState(0)
  const [feedbackTxt, setFeedbackTxt]   = useState('')
  const [commentsTarget, setCommentsTarget] = useState(null) // ticket_id
  const [comments, setComments]         = useState([])
  const [commentText, setCommentText]   = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)

  const { priorities, loading: aiLoading } = useAIPriority(complaints)
  const getPriority = c =>
    priorities[c.ticket_id] || { level: 'Low', color: '#10b981', bg: '#d1fae5', score: 0, tag: 'Analyzing…' }

  const fetchComplaints = useCallback(async () => {
    const { data } = await supabase
      .from('complaints')
      .select('*')
      .eq('user_id', user.username)
      .order('created_at', { ascending: false })
    setComplaints(data || [])
  }, [user.username])

  useEffect(() => { fetchComplaints() }, [fetchComplaints]) // eslint-disable-line react-hooks/set-state-in-effect

  const filtered = complaints
    .filter(c => statusFilter === 'All' || c.status === statusFilter)
    .filter(c => !search ||
      c.ticket_id?.toLowerCase().includes(search.toLowerCase()) ||
      c.issue_text?.toLowerCase().includes(search.toLowerCase()) ||
      c.assigned_role?.toLowerCase().includes(search.toLowerCase())
    )

  const sorted = sortBy === 'priority'
    ? [...filtered].sort((a, b) => (getPriority(b).score || 0) - (getPriority(a).score || 0))
    : filtered

  const stats = {
    total:    complaints.length,
    new:      complaints.filter(c => c.status === 'New').length,
    review:   complaints.filter(c => c.status === 'Under Review').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length,
  }


  const cancelComplaint = async (ticketId) => {
    if (!window.confirm('Cancel this complaint? It will be removed.')) return
    await supabase.from('complaints').delete().eq('ticket_id', ticketId)
    fetchComplaints()
  }

  const submitRating = async () => {
    if (!ratingVal) return
    setSubmittingRating(true)
    await supabase.from('complaints').update({ rating: ratingVal, feedback_text: feedbackTxt }).eq('ticket_id', ratingTarget.ticket_id)
    setRatingTarget(null); setRatingVal(0); setFeedbackTxt(''); setSubmittingRating(false)
    fetchComplaints()
  }

  const openComments = async (ticketId) => {
    setCommentsTarget(ticketId)
    const { data } = await supabase.from('comments').select('*').eq('ticket_id', ticketId).order('created_at')
    setComments(data || [])
  }

  const postComment = async () => {
    if (!commentText.trim()) return
    await supabase.from('comments').insert({ ticket_id: commentsTarget, user_id: user.username, role: user.role || 'STUDENT', message: commentText.trim() })
    setCommentText('')
    const { data } = await supabase.from('comments').select('*').eq('ticket_id', commentsTarget).order('created_at')
    setComments(data || [])
  }

  const estResolutionHours = (c) => {
    // eslint-disable-next-line react-hooks/purity
    const hrs = (Date.now() - new Date(c.created_at)) / 3_600_000
    if (c.status === 'Resolved') return null
    const remaining = Math.max(0, 48 - hrs)
    if (remaining < 1) return 'Overdue'
    return `~${Math.round(remaining)}h remaining`
  }

  return (
    <div style={s.layout}>
      <Sidebar links={[
        { to: '/student',        icon: '🏠', label: 'Dashboard' },
        { to: '/my-complaints',  icon: '📋', label: 'My Complaints' },
        { to: '/departments',    icon: '🏢', label: 'Departments' },
        { to: '/announce',       icon: '📢', label: 'Announcements' },
      ]} />

      <div style={s.main}>

        {/* ── Hero ── */}
        <div style={s.hero}>
          <div style={s.heroPattern} />
          <div style={s.heroBlob} />
          <div style={s.heroContent}>
            <p style={s.heroSub}>📋 Complaint History</p>
            <h1 style={s.heroTitle}>My Complaints</h1>
            <p style={s.heroDesc}>Track every complaint you've submitted — with live AI priority</p>
          </div>

          {/* Stat pills */}
          <div style={s.statRow}>
            {[
              { label: 'Total',      value: stats.total,    color: 'rgba(255,255,255,0.2)',              text: '#fff' },
              { label: 'Pending',    value: stats.new,      color: 'linear-gradient(135deg,#ef4444,#dc2626)', text: '#fff' },
              { label: 'In Review',  value: stats.review,   color: 'linear-gradient(135deg,#f97316,#ea580c)', text: '#fff' },
              { label: 'Resolved',   value: stats.resolved, color: 'linear-gradient(135deg,#10b981,#059669)', text: '#fff' },
            ].map(st => (
              <div key={st.label} style={{ ...s.statPill, background: st.color }}>
                <div style={s.statVal}>{st.value}</div>
                <div style={s.statLabel}>{st.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI bar ── */}
        {aiLoading && (
          <div style={s.aiBar}>🤖 AI is analyzing your complaints for priority scoring…</div>
        )}

        {/* ── Filters ── */}
        <div style={s.filterCard}>
          {/* Search */}
          <div style={s.searchBox}>
            <span style={s.searchIcon}>🔍</span>
            <input
              style={s.searchInput}
              placeholder="Search by ticket ID, issue, department…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <span style={s.clearBtn} onClick={() => setSearch('')}>✕</span>
            )}
          </div>

          {/* Status tabs */}
          <div style={s.tabs}>
            {['All', 'New', 'Under Review', 'Resolved'].map(t => (
              <button
                key={t}
                onClick={() => setStatusFilter(t)}
                style={{ ...s.tab, ...(statusFilter === t ? s.tabActive : {}) }}
              >
                {t}
                {t !== 'All' && (
                  <span style={{
                    ...s.tabCount,
                    background: statusFilter === t ? '#6366f1' : (dark ? '#21262d' : '#e2e8f0'),
                    color: statusFilter === t ? '#fff' : (dark ? '#8b949e' : '#64748b'),
                  }}>
                    {t === 'New' ? stats.new : t === 'Under Review' ? stats.review : stats.resolved}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select style={s.sortSel} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="priority">AI Priority</option>
          </select>
        </div>

        {/* ── Cards ── */}
        <div style={s.listWrap}>
          {sorted.length === 0 ? (
            <div style={s.empty}>
              <div style={{ fontSize: 52 }}>📭</div>
              <div style={s.emptyTitle}>
                {complaints.length === 0 ? 'No complaints yet' : 'No complaints match your filter'}
              </div>
              <div style={s.emptySub}>
                {complaints.length === 0
                  ? 'Go to Dashboard to submit your first complaint.'
                  : 'Try changing the status filter or search term.'}
              </div>
            </div>
          ) : sorted.map((c) => {
            const p    = getPriority(c)
            const dept = c.assigned_role
            const isUnassigned = dept === 'UNASSIGNED'
            return (
              <div key={c.id} style={{
                ...s.card,
                borderLeft: `4px solid ${
                  p.level === 'Critical' ? '#ef4444' :
                  p.level === 'High'     ? '#f97316' :
                  p.level === 'Medium'   ? '#eab308' : '#10b981'
                }`,
              }}>
                {/* Card top row */}
                <div style={s.cardTop}>
                  <div style={s.cardLeft}>
                    <span style={s.ticketId}>{c.ticket_id}</span>
                    <PriorityBadge priority={p} />
                    <StatusBadge status={c.status} />
                  </div>
                  <div style={s.cardRight}>
                    <AgeBadge createdAt={c.created_at} status={c.status} />
                    <span style={s.dateText}>
                      {new Date(c.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Issue text */}
                <div style={s.issueText}>{c.issue_text}</div>

                {/* AI reason */}
                <div style={s.aiReason}>⚡ {p.tag}</div>

                {/* Card bottom */}
                <div style={s.cardBottom}>
                  {isUnassigned ? (
                    <span style={s.pendingPill}>⏳ Pending HOD Assignment</span>
                  ) : (
                    <span style={s.deptPill}>
                      {DEPT_ICONS[dept]} {DEPT_LABELS[dept] || dept.replace('_', ' ')}
                    </span>
                  )}

                  {/* Estimated time + comments */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    {estResolutionHours(c) && (
                      <span style={{ fontSize:11, color:'#6366f1', background: dark?'rgba(99,102,241,0.12)':'#eef2ff', padding:'3px 9px', borderRadius:6, fontWeight:600 }}>
                        🕐 {estResolutionHours(c)}
                      </span>
                    )}
                    <button style={s.commentBtn} onClick={() => openComments(c.ticket_id)}>💬 Notes</button>
                    {c.status === 'New' && (
                      <button style={s.cancelBtn} onClick={() => cancelComplaint(c.ticket_id)}>✕ Cancel</button>
                    )}
                    {c.status === 'Resolved' && !c.rating && (
                      <button style={s.rateBtn} onClick={() => { setRatingTarget(c); setRatingVal(0); setFeedbackTxt('') }}>⭐ Rate</button>
                    )}
                    {c.rating && (
                      <span style={{ fontSize:12, color:'#f59e0b', fontWeight:700 }}>{'⭐'.repeat(c.rating)} Rated</span>
                    )}
                  </div>

                  {/* Progress dots */}
                  <div style={s.progressRow}>
                    {['New', 'Under Review', 'Resolved'].map((step, idx) => {
                      const stepIdx = ['New', 'Under Review', 'Resolved'].indexOf(c.status)
                      const done    = idx <= stepIdx
                      const active  = idx === stepIdx
                      return (
                        <div key={step} style={s.progressStep}>
                          <div style={{
                            ...s.progressDot,
                            background: done ? '#6366f1' : (dark ? '#21262d' : '#e2e8f0'),
                            boxShadow: active ? '0 0 0 3px rgba(99,102,241,0.25)' : 'none',
                            transform: active ? 'scale(1.3)' : 'scale(1)',
                          }} />
                          {idx < 2 && <div style={{ ...s.progressLine, background: idx < stepIdx ? '#6366f1' : (dark ? '#21262d' : '#e2e8f0') }} />}
                          <span style={{ ...s.progressLabel, color: done ? '#6366f1' : '#94a3b8', fontWeight: active ? 700 : 500 }}>
                            {step}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {sorted.length > 0 && (
          <div style={s.footer}>
            Showing {sorted.length} of {complaints.length} complaints
            {sortBy === 'priority' && ' · Sorted by AI priority'}
          </div>
        )}
      </div>

      {/* ── Rating Modal ── */}
      {ratingTarget && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ fontSize:32, marginBottom:8 }}>⭐</div>
            <div style={s.modalTitle}>Rate your experience</div>
            <div style={s.modalSub}>{ratingTarget.ticket_id} — {ratingTarget.issue_text.slice(0,60)}…</div>
            <div style={{ display:'flex', justifyContent:'center', gap:8, margin:'16px 0', fontSize:32 }}>
              {[1,2,3,4,5].map(n => (
                <span key={n} style={{ cursor:'pointer', opacity: n <= ratingVal ? 1 : 0.3, transition:'opacity 0.15s' }}
                  onClick={() => setRatingVal(n)}>⭐</span>
              ))}
            </div>
            <textarea style={s.feedbackTxt} placeholder="Optional feedback…" value={feedbackTxt} onChange={e => setFeedbackTxt(e.target.value)} rows={3} />
            <div style={{ display:'flex', gap:10, marginTop:14 }}>
              <button style={s.rateSubmitBtn} onClick={submitRating} disabled={!ratingVal || submittingRating}>
                {submittingRating ? '⏳ Saving…' : '✅ Submit Rating'}
              </button>
              <button style={s.cancelModalBtn} onClick={() => setRatingTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Comments Modal ── */}
      {commentsTarget && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth:500, textAlign:'left' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={s.modalTitle}>💬 Notes — {commentsTarget}</div>
              <button style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'#94a3b8' }} onClick={() => setCommentsTarget(null)}>✕</button>
            </div>
            <div style={{ maxHeight:240, overflowY:'auto', display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
              {comments.length === 0 && <div style={{ color:'#94a3b8', fontSize:13, textAlign:'center', padding:24 }}>No notes yet</div>}
              {comments.map(cm => (
                <div key={cm.id} style={{ background: cm.role==='STUDENT'?(dark?'rgba(99,102,241,0.12)':'#eef2ff'):(dark?'rgba(16,185,129,0.1)':'#f0fdf4'), borderRadius:10, padding:'10px 14px' }}>
                  <div style={{ fontSize:11, color: dark ? '#8b949e' : '#64748b', marginBottom:4 }}>{cm.user_id} ({cm.role}) · {new Date(cm.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                  <div style={{ fontSize:14, color: dark ? '#e6edf3' : '#0f172a' }}>{cm.message}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input style={{ flex:1, padding:'9px 13px', borderRadius:9, border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, fontSize:13, outline:'none', background: dark ? '#1c2333' : '#fff', color: dark ? '#e6edf3' : '#0f172a' }}
                placeholder="Add a note…" value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key==='Enter' && postComment()} />
              <button style={s.rateSubmitBtn} onClick={postComment}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const makeStyles = (dark) => ({
  layout: { display: 'flex', minHeight: '100vh', background: dark ? '#0d1117' : '#f0f2f8' },
  main:   { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32, overflow: 'hidden' },

  hero: { position: 'relative', overflow: 'hidden', padding: '36px 32px 0', background: 'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)' },
  heroPattern: { position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '20px 20px' },
  heroBlob: { position: 'absolute', right: -80, top: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.3) 0%,transparent 70%)', pointerEvents: 'none' },
  heroContent: { position: 'relative', zIndex: 1, marginBottom: 24 },
  heroSub:  { color: '#a5b4fc', fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 6 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: 800, marginBottom: 6 },
  heroDesc:  { color: '#7c7fa8', fontSize: 14 },

  statRow: { position: 'relative', zIndex: 1, display: 'flex', gap: 12, flexWrap: 'wrap', paddingBottom: 28 },
  statPill: { flex: 1, minWidth: 120, borderRadius: 16, padding: '18px 20px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' },
  statVal:  { fontSize: 30, fontWeight: 800, color: '#fff', lineHeight: 1 },
  statLabel:{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 },

  aiBar: { margin: '0 32px', background: dark ? 'rgba(99,102,241,0.1)' : 'linear-gradient(90deg,#eef2ff,#f5f3ff)', border: `1px solid ${dark ? '#3730a3' : '#c7d2fe'}`, borderRadius: 12, padding: '12px 18px', fontSize: 13, fontWeight: 600, color: dark ? '#a5b4fc' : '#4f46e5' },

  filterCard: { margin: '0 32px', background: dark ? '#161b22' : '#fff', borderRadius: 16, padding: '16px 20px', border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  searchBox:  { display: 'flex', alignItems: 'center', gap: 8, background: dark ? '#1c2333' : '#f8fafc', border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, borderRadius: 12, padding: '0 14px', flex: 1, minWidth: 200 },
  searchIcon: { fontSize: 16, flexShrink: 0 },
  searchInput:{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, padding: '10px 0', flex: 1, color: dark ? '#e6edf3' : '#0f172a' },
  clearBtn:   { fontSize: 13, color: '#94a3b8', cursor: 'pointer', padding: '2px 4px' },
  tabs:       { display: 'flex', gap: 4, background: dark ? '#1c2333' : '#f1f5f9', padding: 4, borderRadius: 10 },
  tab:        { padding: '7px 14px', borderRadius: 7, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: dark ? '#8b949e' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  tabActive:  { background: dark ? '#0d1117' : '#fff', color: dark ? '#e6edf3' : '#0f172a', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  tabCount:   { padding: '1px 7px', borderRadius: '999px', fontSize: 11, fontWeight: 700 },
  sortSel:    { padding: '9px 14px', borderRadius: 10, border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, fontSize: 13, background: dark ? '#1c2333' : '#f8fafc', cursor: 'pointer', fontWeight: 500, color: dark ? '#c9d1d9' : '#374151' },

  listWrap: { display: 'flex', flexDirection: 'column', gap: 14, padding: '0 32px' },

  card: {
    background: dark ? '#161b22' : '#fff', borderRadius: 16, padding: '20px 22px',
    border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    transition: 'box-shadow 0.2s',
  },
  cardTop:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  cardLeft:  { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardRight: { display: 'flex', alignItems: 'center', gap: 8 },
  ticketId:  { fontFamily: 'monospace', fontWeight: 800, color: dark ? '#a5b4fc' : '#6366f1', background: dark ? 'rgba(99,102,241,0.15)' : '#eef2ff', padding: '3px 10px', borderRadius: 6, fontSize: 13 },
  dateText:  { fontSize: 12, color: '#94a3b8' },

  issueText: { fontSize: 15, color: dark ? '#e6edf3' : '#1e293b', fontWeight: 500, lineHeight: 1.6, marginBottom: 6 },
  aiReason:  { fontSize: 12, color: dark ? '#a5b4fc' : '#6366f1', background: dark ? 'rgba(99,102,241,0.12)' : '#eef2ff', display: 'inline-block', padding: '3px 10px', borderRadius: 8, marginBottom: 14, fontWeight: 500 },

  cardBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  deptPill:   { fontSize: 12, color: dark ? '#94a3b8' : '#475569', background: dark ? '#1c2333' : '#f1f5f9', padding: '4px 12px', borderRadius: '999px', fontWeight: 600, border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}` },
  pendingPill:{ fontSize: 12, color: '#92400e', background: '#fef9c3', padding: '4px 12px', borderRadius: '999px', fontWeight: 600, border: '1px solid #fde68a' },

  progressRow:  { display: 'flex', alignItems: 'center', gap: 0 },
  progressStep: { display: 'flex', alignItems: 'center', gap: 0, flexDirection: 'column', position: 'relative' },
  progressDot:  { width: 10, height: 10, borderRadius: '50%', transition: 'all 0.3s', zIndex: 1 },
  progressLine: { width: 48, height: 2, marginTop: -6, marginBottom: 0, position: 'absolute', left: '50%', top: 4, zIndex: 0 },
  progressLabel:{ fontSize: 10, marginTop: 6, whiteSpace: 'nowrap', letterSpacing: '0.3px' },

  empty:      { textAlign: 'center', padding: '60px 20px', color: '#94a3b8' },
  emptyTitle: { fontSize: 16, fontWeight: 700, color: dark ? '#94a3b8' : '#475569', marginTop: 12, marginBottom: 6 },
  emptySub:   { fontSize: 13 },

  footer: { textAlign: 'center', fontSize: 12, color: '#94a3b8', padding: '0 32px' },
  cancelBtn: { fontSize:11, fontWeight:700, color:'#dc2626', background: dark ? 'rgba(220,38,38,0.15)' : '#fff0f0', border:'1px solid #fca5a5', borderRadius:6, padding:'3px 9px', cursor:'pointer' },
  rateBtn: { fontSize:11, fontWeight:700, color:'#d97706', background: dark?'rgba(217,119,6,0.12)':'#fffbeb', border:'1px solid #fde68a', borderRadius:6, padding:'3px 9px', cursor:'pointer' },
  commentBtn: { fontSize:11, fontWeight:700, color: dark?'#a5b4fc':'#6366f1', background: dark?'rgba(99,102,241,0.12)':'#eef2ff', border:'1px solid #c7d2fe', borderRadius:6, padding:'3px 9px', cursor:'pointer' },
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background: dark ? '#161b22' : '#fff', borderRadius:20, padding:28, maxWidth:400, width:'90%', textAlign:'center', boxShadow:'0 24px 64px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize:17, fontWeight:800, color: dark ? '#e6edf3' : '#0f172a', marginBottom:6 },
  modalSub: { fontSize:12, color: dark ? '#8b949e' : '#64748b', lineHeight:1.5 },
  feedbackTxt: { width:'100%', padding:'10px', borderRadius:10, border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, fontSize:13, resize:'none', outline:'none', boxSizing:'border-box', fontFamily:'inherit', background: dark ? '#1c2333' : '#f8fafc', color: dark ? '#e6edf3' : '#0f172a' },
  rateSubmitBtn: { flex:1, padding:'10px', background:'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' },
  cancelModalBtn: { flex:1, padding:'10px', background: dark ? '#1c2333' : '#f1f5f9', color: dark ? '#94a3b8' : '#475569', border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer' },
})
