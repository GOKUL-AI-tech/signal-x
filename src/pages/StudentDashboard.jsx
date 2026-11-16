import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { detectEmotion } from '../lib/emotionDetector'
import { checkDuplicate } from '../lib/duplicateDetector'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { useDarkMode } from '../context/DarkModeContext'
import StatCard from '../components/StatCard'

function autoAssignRole(issue) {
  const t = issue.toLowerCase()
  if (t.includes('wifi')||t.includes('network')||t.includes('internet')||t.includes('computer')) return 'IT_SUPPORT'
  if (t.includes('lab')) return 'LAB_INCHARGE'
  if (t.includes('library')||t.includes('book')) return 'LIBRARIAN'
  if (t.includes('bus')||t.includes('transport')||t.includes('vehicle')) return 'TRANSPORT'
  if (t.includes('hostel')||t.includes('room')||t.includes('mess')) return 'HOSTEL'
  if (t.includes('fees')||t.includes('office')||t.includes('certificate')) return 'OFFICE'
  return 'FACULTY'
}

const DEPT_ICONS = { IT_SUPPORT:'💻', LAB_INCHARGE:'🧪', LIBRARIAN:'📚', TRANSPORT:'🚌', HOSTEL:'🏠', OFFICE:'🏢', FACULTY:'👨‍🏫' }

export default function StudentDashboard() {
  const { user } = useAuth()
  const { dark } = useDarkMode()
  const s = makeStyles(dark)
  const location = useLocation()
  const [complaints, setComplaints] = useState([])
  const [deptHint,   setDeptHint]   = useState('')  // dept pre-selected from /departments
  const [issueText,  setIssueText]  = useState('')
  const [loading,    setLoading]    = useState(false)
  const [success,    setSuccess]    = useState(false)

  const [anonymous, setAnonymous] = useState(false)

  useEffect(() => {
    const dept = new URLSearchParams(location.search).get('dept')
    if (dept) { setDeptHint(dept); window.scrollTo({ top: 300, behavior: 'smooth' }) } // eslint-disable-line react-hooks/set-state-in-effect
  }, [location.search])

  const detected = useMemo(() => {
    if (issueText.length > 6) return autoAssignRole(issueText)
    return ''
  }, [issueText])

  const emotion = useMemo(() => detectEmotion(issueText), [issueText])
  const duplicate = useMemo(() => checkDuplicate(issueText, complaints), [issueText, complaints])


  const fetchComplaints = useCallback(async () => {
    const { data } = await supabase.from('complaints').select('*').eq('user_id', user.username).order('created_at', { ascending: false })
    setComplaints(data || [])
  }, [user.username])

  useEffect(() => { fetchComplaints() }, [fetchComplaints]) // eslint-disable-line react-hooks/set-state-in-effect

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!issueText.trim()) return
    setLoading(true)
    const { count } = await supabase.from('complaints').select('*', { count:'exact', head:true })
    const ticketId = `T${String((count||0)+1).padStart(3,'0')}`
    // Detect emotional distress at submit time for DB record
    const emotionAtSubmit = detectEmotion(issueText)
    await supabase.from('complaints').insert({
      ticket_id: ticketId,
      user_id: user.username,
      issue_text: issueText,
      category: emotionAtSubmit ? emotionAtSubmit.level : 'General',
      status: 'New',
      assigned_role: 'UNASSIGNED',   // HOD will assign to department
      emotion_flag: emotionAtSubmit ? emotionAtSubmit.level : null,
      escalated: emotionAtSubmit ? true : false,
      anonymous,
    })
    setIssueText('')
    setSuccess(true); setLoading(false)
    fetchComplaints()
    setTimeout(() => setSuccess(false), 4000)
  }

  const stats = { total:complaints.length, new:complaints.filter(c=>c.status==='New').length, resolved:complaints.filter(c=>c.status==='Resolved').length }

  return (
    <div style={s.layout}>
      <Sidebar links={[
        { to:'/student',       icon:'🏠', label:'Dashboard' },
        { to:'/my-complaints', icon:'📋', label:'My Complaints' },
        { to:'/departments',   icon:'🏢', label:'Departments' },
        { to:'/announce',      icon:'📢', label:'Announcements' },
      ]} />

      <div style={s.main}>
        {/* ── Hero ── */}
        <div style={s.hero}>
          <div style={s.heroPattern} />
          <div style={s.heroBlob} />
          <div style={s.heroContent}>
            <div>
              <p style={s.heroSub}>🎓 Student Portal</p>
              <h1 style={s.heroTitle}>Welcome back, {user.username}!</h1>
              <p style={s.heroDesc}>Submit and track your complaints in real-time</p>
            </div>
          </div>
          <div style={s.heroStats}>
            <StatCard icon="📋" label="Total Submitted" value={stats.total}   gradient="rgba(255,255,255,0.15)" />
            <StatCard icon="🔔" label="Pending"          value={stats.new}     gradient="linear-gradient(135deg,#ef4444,#dc2626)" />
            <StatCard icon="✅" label="Resolved"         value={stats.resolved} gradient="linear-gradient(135deg,#10b981,#059669)" />
          </div>
        </div>

        {/* ── Success ── */}
        {success && (
          <div style={s.successBox}>
            <div style={s.successIcon}>🎉</div>
            <div>
              <div style={s.successTitle}>Complaint submitted successfully!</div>
              <div style={s.successSub}>Our team will review and respond shortly.</div>
            </div>
          </div>
        )}

        {/* ── Dept hint (from Departments page) ── */}
        {deptHint && (
          <div style={{ margin:'0 32px', background: dark ? 'rgba(99,102,241,0.15)' : '#eef2ff', border: `2px solid ${dark ? '#4f46e5' : '#c7d2fe'}`, borderRadius:12, padding:'12px 18px', fontSize:14, fontWeight:600, color: dark ? '#a5b4fc' : '#4338ca', display:'flex', alignItems:'center', gap:10 }}>
            🏢 Submitting for: <strong>{deptHint.replace(/_/g,' ')}</strong>
            <span onClick={() => setDeptHint('')} style={{ marginLeft:'auto', cursor:'pointer', color:'#94a3b8', fontSize:16 }}>✕</span>
          </div>
        )}

        {/* ── Submit card ── */}
        <div style={s.card}>
          <div style={s.cardHead}>
            <div style={s.cardIcon}>📝</div>
            <div>
              <h3 style={s.cardTitle}>Submit a New Complaint</h3>

            </div>
          </div>

          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.field}>
              <label style={s.label}>Describe Your Issue</label>
              <textarea
                style={s.textarea}
                placeholder="Describe your issue clearly. E.g. 'The WiFi in Block C has been down for 2 days…' — AI will automatically detect the right department."
                value={issueText}
                onChange={e => setIssueText(e.target.value)}
                required
              />
              <div style={s.textareaFooter}>
                {detected ? (
                  <div style={s.aiDetect}>
                    🤖 AI routing to: <strong>{DEPT_ICONS[detected]} {detected.replace(/_/g,' ')}</strong>
                  </div>
                ) : (
                  <div />
                )}
                <span style={s.charCount}>{issueText.length} chars</span>
              </div>
            </div>

            {/* ── Anonymous toggle ── */}
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background: dark ? '#1c2333' : '#f8fafc', borderRadius:10, border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}` }}>
              <input type="checkbox" id="anon" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} style={{ width:16, height:16, cursor:'pointer' }} />
              <label htmlFor="anon" style={{ fontSize:14, color: dark ? '#c9d1d9' : '#374151', fontWeight:500, cursor:'pointer' }}>
                🕵️ Submit anonymously — your name will be hidden from staff
              </label>
            </div>

            {/* ── Duplicate warning ── */}
            {duplicate.isDuplicate && (
              <div style={{ background: dark?'rgba(251,191,36,0.08)':'#fffbeb', border: `2px solid ${dark?'#b45309':'#fde68a'}`, borderRadius:12, padding:'14px 18px', display:'flex', gap:12 }}>
                <span style={{ fontSize:24 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight:700, color: dark?'#fbbf24':'#92400e', fontSize:14 }}>Possible duplicate complaint</div>
                  <div style={{ fontSize:13, color:'#78350f', marginTop:3 }}>
                    This looks {duplicate.similarity}% similar to <strong>{duplicate.matchedTicket}</strong> which is still open. Submit only if this is a different issue.
                  </div>
                </div>
              </div>
            )}

            {/* ── Emotional distress banner ── */}
            {emotion && (
              <div style={{
                background: emotion.bg,
                border: `2px solid ${emotion.border}`,
                borderRadius: 14,
                padding: '16px 20px',
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
                animation: 'fadeIn 0.3s ease',
              }}>
                <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{emotion.icon}</div>
                <div>
                  <div style={{ fontWeight: 800, color: emotion.color, fontSize: 15, marginBottom: 4 }}>
                    {emotion.title}
                  </div>
                  <div style={{ fontSize: 13, color: dark ? '#c9d1d9' : '#374151', lineHeight: 1.6 }}>
                    {emotion.message}
                  </div>
                  {emotion.level === 'crisis' && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 6 }}>
                        🔴 CRITICAL PRIORITY
                      </span>
                      <span style={{ background: '#fef2f2', color: '#991b1b', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, border: '1px solid #fca5a5' }}>
                        📞 Speak to a counselor or trusted faculty immediately
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button type="submit" style={s.submitBtn} disabled={loading}>
                {loading ? '⏳ Submitting…' : '🚀 Submit Complaint'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}

const makeStyles = (dark) => ({
  layout: { display:'flex', minHeight:'100vh', background: dark ? '#0d1117' : '#f0f2f8' },
  main:   { flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:20, paddingBottom:32, overflow:'hidden' },
  hero: { position:'relative', overflow:'hidden', padding:'36px 32px 0', background:'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)' },
  heroPattern: { position:'absolute', inset:0, opacity:0.05, backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize:'20px 20px' },
  heroBlob: { position:'absolute', right:-80, top:-80, width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.3) 0%,transparent 70%)', pointerEvents:'none' },
  heroContent: { position:'relative', zIndex:1, marginBottom:28 },
  heroSub: { color:'#a5b4fc', fontSize:11, fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', marginBottom:6 },
  heroTitle: { color:'#fff', fontSize:28, fontWeight:800, marginBottom:6 },
  heroDesc: { color:'#7c7fa8', fontSize:14 },
  heroStats: { position:'relative', zIndex:1, display:'flex', gap:12, flexWrap:'wrap', paddingBottom:28 },

  successBox: { margin:'0 32px', display:'flex', alignItems:'center', gap:16, background:'linear-gradient(135deg,#d1fae5,#a7f3d0)', border:'2px solid #6ee7b7', borderRadius:16, padding:'18px 24px' },
  successIcon: { fontSize:32, flexShrink:0 },
  successTitle: { fontWeight:700, color:'#065f46', fontSize:15 },
  successSub: { color:'#047857', fontSize:13, marginTop:2 },

  card: { margin:'0 32px', background: dark ? '#161b22' : '#fff', borderRadius:20, padding:24, border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}`, boxShadow:'0 4px 20px rgba(0,0,0,0.06)' },
  cardHead: { display:'flex', alignItems:'flex-start', gap:14, marginBottom:20 },
  cardIcon: { width:48, height:48, borderRadius:14, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0, boxShadow:'0 6px 16px rgba(99,102,241,0.35)' },
  cardTitle: { fontSize:17, fontWeight:700, color: dark ? '#e6edf3' : '#0f172a', marginBottom:3 },
  cardSub: { fontSize:13, color: dark ? '#8b949e' : '#64748b' },
  form: { display:'flex', flexDirection:'column', gap:16 },
  field: { display:'flex', flexDirection:'column' },
  label: { display:'block', fontSize:13, fontWeight:700, color: dark ? '#c9d1d9' : '#374151', marginBottom:8, letterSpacing:'0.3px' },
  textarea: { width:'100%', height:160, padding:16, borderRadius:14, border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, fontSize:15, background: dark ? '#1c2333' : '#f8fafc', resize:'none', outline:'none', color: dark ? '#e6edf3' : '#0f172a', lineHeight:1.7, boxSizing:'border-box', transition:'border-color 0.2s' },
  textareaFooter: { display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8 },
  aiDetect: { fontSize:13, color: dark?'#a5b4fc':'#4f46e5', background: dark?'rgba(99,102,241,0.12)':'#eef2ff', padding:'6px 14px', borderRadius:8, border:'1px solid #c7d2fe', fontWeight:600 },
  aiHint: { fontSize:12, color:'#94a3b8', fontStyle:'italic' },
  charCount: { fontSize:11, color:'#94a3b8' },
  submitBtn: { padding:'13px 32px', background:'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:800, boxShadow:'0 8px 24px rgba(99,102,241,0.4)', letterSpacing:'0.3px' },

  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background:dark ? 'linear-gradient(90deg,#161b22,#1c2333)' : 'linear-gradient(90deg,#f8fafc,#f0f4ff)' },
  th: { textAlign:'left', padding:'13px 14px', fontSize:11, fontWeight:700, color: dark ? '#8b949e' : '#64748b', textTransform:'uppercase', letterSpacing:'0.8px', borderBottom: `2px solid ${dark ? '#21262d' : '#f1f5f9'}`, whiteSpace:'nowrap' },
  tr: { borderBottom: `1px solid ${dark ? '#21262d' : '#f8fafc'}` },
  td: { padding:'14px', fontSize:13, color: dark ? '#c9d1d9' : '#374151', verticalAlign:'middle' },
  empty: { padding:'60px', textAlign:'center', color:'#94a3b8', fontSize:14 },
  ticketId: { fontFamily:'monospace', fontWeight:800, color: dark?'#a5b4fc':'#6366f1', background: dark?'rgba(99,102,241,0.15)':'#eef2ff', padding:'3px 8px', borderRadius:6, fontSize:13 },
  issueText: { overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:500 },
  deptTag: { fontSize:12, color: dark ? '#94a3b8' : '#475569', background: dark ? '#1c2333' : '#f1f5f9', padding:'3px 10px', borderRadius:'999px', fontWeight:500 },
  pendingTag: { fontSize:12, color: dark?'#fbbf24':'#92400e', background: dark?'rgba(251,191,36,0.12)':'#fef9c3', padding:'3px 10px', borderRadius:'999px', fontWeight:600, border: `1px solid ${dark?'#92400e':'#fde047'}` },
})
