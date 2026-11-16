import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { useDarkMode } from '../context/DarkModeContext'

const PRIORITY_STYLE = {
  urgent:    { color:'#dc2626', bg:'#fee2e2', border:'#fca5a5', icon:'🚨' },
  important: { color:'#c2410c', bg:'#fff7ed', border:'#fb923c', icon:'📢' },
  normal:    { color:'#0369a1', bg:'#e0f2fe', border:'#7dd3fc', icon:'📌' },
}

const STUDENT_LINKS = [
  { to:'/student',       icon:'🏠', label:'Dashboard' },
  { to:'/my-complaints', icon:'📋', label:'My Complaints' },
  { to:'/departments',   icon:'🏢', label:'Departments' },
  { to:'/announce',      icon:'📢', label:'Announcements' },
]

const STAFF_LINKS = [{ to:'/staff', icon:'🏠', label:'My Dashboard' }, { to:'/announce', icon:'📢', label:'Announcements' }]
const HOD_LINKS   = [{ to:'/hod', icon:'📋', label:'HOD Overview' }, { to:'/analytics', icon:'📊', label:'Analytics' }, { to:'/announce', icon:'📢', label:'Announcements' }]
const ADMIN_LINKS  = [{ to:'/admin', icon:'🏠', label:'Dashboard' }, { to:'/users', icon:'👥', label:'Users' }, { to:'/announce', icon:'📢', label:'Announcements' }, { to:'/analytics', icon:'📊', label:'Analytics' }]

export default function Announcements() {
  const { user } = useAuth()
  const { dark } = useDarkMode()
  const s = makeStyles(dark)
  const isAdmin = user?.role === 'ADMIN'
  const [announcements, setAnnouncements] = useState([])
  const [form, setForm] = useState({ title:'', body:'', priority:'normal' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    setAnnouncements(data || [])
  }, [])

  useEffect(() => { fetch() }, [fetch]) // eslint-disable-line react-hooks/set-state-in-effect

  const handlePost = async () => {
    if (!form.title.trim() || !form.body.trim()) return
    setSaving(true)
    await supabase.from('announcements').insert({ ...form, created_by: user.username })
    setForm({ title:'', body:'', priority:'normal' }); setSaving(false); fetch()
  }

  const handleDelete = async (id) => {
    await supabase.from('announcements').delete().eq('id', id)
    setDeleting(null); fetch()
  }

  const sidebarLinks = user?.role === 'ADMIN' ? ADMIN_LINKS
    : user?.role === 'HOD' ? HOD_LINKS
    : user?.role === 'STUDENT' ? STUDENT_LINKS
    : STAFF_LINKS

  return (
    <div style={s.layout}>
      <Sidebar links={sidebarLinks} />

      <div style={s.main}>
        {/* Hero */}
        <div style={s.hero}>
          <div style={s.heroPattern} />
          <h1 style={s.heroTitle}>📢 Announcements</h1>
          <p style={s.heroDesc}>Official notices from Nehru Arts & Science College administration</p>
        </div>

        {/* Admin compose form */}
        {isAdmin && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>📝 Post New Announcement</h3>
            <div style={s.formCol}>
              <input style={s.input} placeholder="Title…" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} />
              <textarea style={s.textarea} placeholder="Write your announcement here…" rows={4} value={form.body} onChange={e => setForm(f => ({...f, body: e.target.value}))} />
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <select style={s.sel} value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))}>
                  <option value="normal">📌 Normal</option>
                  <option value="important">📢 Important</option>
                  <option value="urgent">🚨 Urgent</option>
                </select>
                <button style={s.postBtn} onClick={handlePost} disabled={saving}>
                  {saving ? '⏳ Posting…' : '📢 Post Announcement'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Announcements list */}
        <div style={s.listWrap}>
          {announcements.length === 0 ? (
            <div style={s.empty}>
              <div style={{ fontSize:48 }}>📭</div>
              <div style={s.emptyTitle}>No announcements yet</div>
              <div style={s.emptySub}>Check back later for college updates</div>
            </div>
          ) : announcements.map(a => {
            const ps = PRIORITY_STYLE[a.priority] || PRIORITY_STYLE.normal
            return (
              <div key={a.id} style={{ ...s.announceCard, borderLeft:`4px solid ${ps.border}`, background: dark ? 'rgba(255,255,255,0.04)' : ps.bg }}>
                <div style={s.announceTop}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:22 }}>{ps.icon}</span>
                    <div>
                      <div style={{ ...s.announceTitle, color: ps.color }}>{a.title}</div>
                      <div style={s.announceMeta}>
                        By {a.created_by} · {new Date(a.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ ...s.priorityBadge, color: ps.color, border:`1px solid ${ps.border}` }}>
                      {a.priority.toUpperCase()}
                    </span>
                    {isAdmin && (
                      <button style={s.delBtn} onClick={() => setDeleting(a.id)}>🗑</button>
                    )}
                  </div>
                </div>
                <div style={s.announceBody}>{a.body}</div>
              </div>
            )
          })}
        </div>

        {/* Delete confirm */}
        {deleting && (
          <div style={s.overlay}>
            <div style={s.modal}>
              <div style={{ fontSize:32, marginBottom:12 }}>🗑️</div>
              <div style={s.modalTitle}>Delete this announcement?</div>
              <div style={{ display:'flex', gap:10, marginTop:16 }}>
                <button style={s.delConfirmBtn} onClick={() => handleDelete(deleting)}>Delete</button>
                <button style={s.cancelBtn} onClick={() => setDeleting(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const makeStyles = (dark) => ({
  layout: { display:'flex', minHeight:'100vh', background: dark ? '#0d1117' : '#f0f2f8' },
  main: { flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:20, paddingBottom:32, overflow:'hidden' },

  hero: { position:'relative', overflow:'hidden', padding:'36px 32px 28px', background:'linear-gradient(135deg,#0f172a,#1e3a5f,#0f172a)' },
  heroPattern: { position:'absolute', inset:0, opacity:0.04, backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize:'20px 20px' },
  heroTitle: { position:'relative', zIndex:1, color:'#fff', fontSize:28, fontWeight:800, marginBottom:6 },
  heroDesc: { position:'relative', zIndex:1, color:'rgba(255,255,255,0.6)', fontSize:14 },

  card: { margin:'0 32px', background: dark ? '#161b22' : '#fff', borderRadius:20, padding:24, border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}`, boxShadow:'0 4px 20px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize:16, fontWeight:800, color: dark ? '#e6edf3' : '#0f172a', marginBottom:16 },
  formCol: { display:'flex', flexDirection:'column', gap:12 },
  input: { padding:'11px 14px', borderRadius:10, border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, fontSize:14, background: dark ? '#1c2333' : '#f8fafc', outline:'none', color: dark ? '#e6edf3' : '#0f172a', fontWeight:500 },
  textarea: { padding:'11px 14px', borderRadius:10, border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, fontSize:14, background: dark ? '#1c2333' : '#f8fafc', outline:'none', color: dark ? '#e6edf3' : '#0f172a', resize:'vertical', lineHeight:1.6, fontFamily:'inherit' },
  sel: { padding:'10px 14px', borderRadius:10, border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, fontSize:13, background: dark ? '#1c2333' : '#f8fafc', cursor:'pointer', fontWeight:500, color: dark?'#c9d1d9':'#374151' },
  postBtn: { padding:'11px 28px', background:'linear-gradient(135deg,#0ea5e9,#0284c7)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 12px rgba(14,165,233,0.35)' },

  listWrap: { display:'flex', flexDirection:'column', gap:14, padding:'0 32px' },
  announceCard: { borderRadius:16, padding:'20px 24px', border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}`, boxShadow:'0 2px 10px rgba(0,0,0,0.04)' },
  announceTop: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:12, flexWrap:'wrap' },
  announceTitle: { fontWeight:800, fontSize:16, marginBottom:3 },
  announceMeta: { fontSize:12, color: dark ? '#8b949e' : '#64748b' },
  priorityBadge: { fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:6, background:'transparent', letterSpacing:'0.5px' },
  announceBody: { fontSize:14, color: dark ? '#c9d1d9' : '#374151', lineHeight:1.7 },
  delBtn: { padding:'5px 9px', background:'rgba(220,38,38,0.08)', color:'#dc2626', border:'1px solid rgba(220,38,38,0.2)', borderRadius:7, fontSize:12, cursor:'pointer' },

  empty: { textAlign:'center', padding:'60px 20px', color:'#94a3b8' },
  emptyTitle: { fontSize:16, fontWeight:700, color: dark ? '#94a3b8' : '#475569', marginTop:12, marginBottom:6 },
  emptySub: { fontSize:13 },

  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background: dark ? '#161b22' : '#fff', borderRadius:20, padding:32, maxWidth:340, width:'90%', textAlign:'center', boxShadow:'0 24px 64px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize:16, fontWeight:800, color: dark ? '#e6edf3' : '#0f172a', marginBottom:8 },
  delConfirmBtn: { flex:1, padding:'11px', background:'#dc2626', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' },
  cancelBtn: { flex:1, padding:'11px', background: dark ? '#1c2333' : '#f1f5f9', color: dark ? '#94a3b8' : '#475569', border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer' },
})
