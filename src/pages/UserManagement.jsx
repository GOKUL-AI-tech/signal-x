import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import { useDarkMode } from '../context/DarkModeContext'

const ROLES = ['STUDENT', 'FACULTY', 'HOD', 'STAFF', 'ADMIN']
const DEPTS = ['IT_SUPPORT', 'LAB_INCHARGE', 'LIBRARIAN', 'TRANSPORT', 'HOSTEL', 'OFFICE', 'FACULTY']
const DEPT_ROLES = ['STAFF', 'FACULTY']

const blank = { username: '', password: '', role: 'STUDENT', department: '' }

export default function UserManagement() {
  const { user } = useAuth()
  const { dark } = useDarkMode()
  const s = makeStyles(dark)
  const [users, setUsers]       = useState([])
  const [search, setSearch]     = useState('')
  const [form, setForm]         = useState(blank)
  const [editing, setEditing]   = useState(null)  // user id being edited
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [roleFilter, setRole]   = useState('All')
  const [confirm, setConfirm]   = useState(null)  // username to delete

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('users').select('*').order('role').order('username')
    setUsers(data || [])
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers]) // eslint-disable-line react-hooks/set-state-in-effect

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const handleSave = async () => {
    if (!form.username.trim() || !form.password.trim()) return flash('Username and password required.')
    setSaving(true)
    const payload = {
      username: form.username.trim(),
      password: form.password.trim(),
      role: form.role,
      department: DEPT_ROLES.includes(form.role) ? form.department || null : null,
    }
    if (editing) {
      await supabase.from('users').update(payload).eq('id', editing)
      flash('✅ User updated.')
    } else {
      const { error } = await supabase.from('users').insert(payload)
      if (error?.code === '23505') { flash('⚠️ Username already exists.'); setSaving(false); return }
      flash('✅ User added.')
    }
    setForm(blank); setEditing(null); setSaving(false); fetchUsers()
  }

  const handleEdit = (u) => {
    setEditing(u.id)
    setForm({ username: u.username, password: u.password, role: u.role, department: u.department || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (username) => {
    await supabase.from('users').delete().eq('username', username)
    setConfirm(null); fetchUsers(); flash('🗑 User deleted.')
  }

  const filtered = users
    .filter(u => roleFilter === 'All' || u.role === roleFilter)
    .filter(u => !search || u.username.toLowerCase().includes(search.toLowerCase()))

  const counts = ROLES.reduce((acc, r) => ({ ...acc, [r]: users.filter(u => u.role === r).length }), {})

  return (
    <div style={s.layout}>
      <Sidebar links={[
        { to: '/admin',    icon: '🏠', label: 'Dashboard' },
        { to: '/users',    icon: '👥', label: 'Users' },
        { to: '/announce', icon: '📢', label: 'Announcements' },
        { to: '/analytics',icon: '📊', label: 'Analytics' },
      ]} />

      <div style={s.main}>
        {/* Hero */}
        <div style={s.hero}>
          <div style={s.heroPattern} />
          <div style={s.heroContent}>
            <p style={s.heroSub}>👑 Admin Panel</p>
            <h1 style={s.heroTitle}>User Management</h1>
            <p style={s.heroDesc}>Add, edit and remove all college accounts — Welcome, {user.username}</p>
          </div>
          <div style={s.statRow}>
            {[['All', users.length, '#6366f1'], ...ROLES.map(r => [r, counts[r] || 0, '#0ea5e9'])].map(([label, val, color]) => (
              <div key={label} style={{ ...s.statChip, borderColor: color }}>
                <span style={{ fontWeight: 800, color, fontSize: 18 }}>{val}</span>
                <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {msg && <div style={s.flash}>{msg}</div>}

        {/* Form */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>{editing ? '✏️ Edit User' : '➕ Add New User'}</h3>
          <div style={s.formGrid}>
            <div style={s.field}>
              <label style={s.label}>Username</label>
              <input style={s.input} value={form.username} onChange={e => setForm(f => ({...f, username: e.target.value}))}
                placeholder="e.g. student4" disabled={!!editing} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Password</label>
              <input style={s.input} value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
                placeholder="Password" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Role</label>
              <select style={s.input} value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value, department: ''}))}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            {DEPT_ROLES.includes(form.role) && (
              <div style={s.field}>
                <label style={s.label}>Department</label>
                <select style={s.input} value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))}>
                  <option value="">— Select —</option>
                  {DEPTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:10, marginTop:16 }}>
            <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? '⏳ Saving…' : editing ? '💾 Save Changes' : '➕ Add User'}
            </button>
            {editing && (
              <button style={s.cancelBtn} onClick={() => { setEditing(null); setForm(blank) }}>
                ✕ Cancel
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div style={s.filterRow}>
          <div style={s.searchBox}>
            <span>🔍</span>
            <input style={s.searchInput} placeholder="Search username…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={s.tabs}>
            {['All', ...ROLES].map(r => (
              <button key={r} style={{...s.tab, ...(roleFilter===r ? s.tabActive : {})}} onClick={() => setRole(r)}>{r}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={s.tableCard}>
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                {['Username','Role','Department','Password','Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={s.empty}>No users found</td></tr>
              ) : filtered.map((u, i) => (
                <tr key={u.id} style={{ background: i%2===0 ? (dark?'#161b22':'#fff') : (dark?'#1a2233':'#fafbff'), borderBottom: `1px solid ${dark ? '#21262d' : '#f1f5f9'}` }}>
                  <td style={s.td}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13 }}>
                        {u.username[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight:700, color: dark ? '#e6edf3' : '#0f172a' }}>{u.username}</span>
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={{ padding:'3px 10px', borderRadius:6, fontSize:12, fontWeight:700, background:
                      dark?(u.role==='ADMIN'?'rgba(245,158,11,0.15)':u.role==='HOD'?'rgba(14,165,233,0.15)':u.role==='STUDENT'?'rgba(99,102,241,0.15)':'rgba(16,185,129,0.15)'):(u.role==='ADMIN'?'#fef3c7':u.role==='HOD'?'#e0f2fe':u.role==='STUDENT'?'#eef2ff':'#f0fdf4'),
                      color: u.role==='ADMIN'?'#92400e':u.role==='HOD'?'#0369a1':u.role==='STUDENT'?'#4338ca':'#166534'
                    }}>{u.role}</span>
                  </td>
                  <td style={s.td}>{u.department ? u.department.replace('_',' ') : <span style={{color:'#94a3b8'}}>—</span>}</td>
                  <td style={s.td}>
                    <span style={{ fontFamily:'monospace', fontSize:12, color: dark ? '#8b949e' : '#64748b', background: dark ? '#1c2333' : '#f1f5f9', padding:'2px 8px', borderRadius:4 }}>
                      {u.password}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button style={s.editBtn} onClick={() => handleEdit(u)}>✏️ Edit</button>
                      {u.username !== user.username && (
                        <button style={s.delBtn} onClick={() => setConfirm(u.username)}>🗑</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={s.tableFooter}>{filtered.length} users · {users.length} total</div>
        </div>

        {/* Delete confirm modal */}
        {confirm && (
          <div style={s.modalOverlay}>
            <div style={s.modal}>
              <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
              <div style={s.modalTitle}>Delete user "{confirm}"?</div>
              <div style={s.modalSub}>This cannot be undone. Their complaints will remain.</div>
              <div style={{ display:'flex', gap:10, marginTop:20 }}>
                <button style={s.delConfirmBtn} onClick={() => handleDelete(confirm)}>Yes, Delete</button>
                <button style={s.cancelBtn} onClick={() => setConfirm(null)}>Cancel</button>
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
  main:   { flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:20, paddingBottom:32, overflow:'hidden' },

  hero: { position:'relative', overflow:'hidden', padding:'36px 32px 24px', background:'linear-gradient(135deg,#1e1b4b,#312e81,#4c1d95)' },
  heroPattern: { position:'absolute', inset:0, opacity:0.05, backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize:'20px 20px' },
  heroContent: { position:'relative', zIndex:1, marginBottom:20 },
  heroSub: { color:'#c4b5fd', fontSize:11, fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', marginBottom:6 },
  heroTitle: { color:'#fff', fontSize:28, fontWeight:800, marginBottom:6 },
  heroDesc: { color:'rgba(255,255,255,0.6)', fontSize:14 },
  statRow: { position:'relative', zIndex:1, display:'flex', gap:10, flexWrap:'wrap' },
  statChip: { background:'rgba(255,255,255,0.08)', border:'2px solid', borderRadius:12, padding:'10px 18px', display:'flex', flexDirection:'column', alignItems:'center', gap:2, minWidth:80 },

  flash: { margin:'0 32px', background: dark?'rgba(16,185,129,0.12)':'#d1fae5', border: `1px solid ${dark?'#059669':'#6ee7b7'}`, borderRadius:12, padding:'12px 18px', fontSize:14, fontWeight:600, color: dark?'#34d399':'#065f46' },

  card: { margin:'0 32px', background: dark ? '#161b22' : '#fff', borderRadius:20, padding:24, border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}`, boxShadow:'0 4px 20px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize:16, fontWeight:800, color: dark ? '#e6edf3' : '#0f172a', marginBottom:16 },
  formGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14 },
  field: { display:'flex', flexDirection:'column', gap:6 },
  label: { fontSize:12, fontWeight:700, color: dark ? '#c9d1d9' : '#374151', textTransform:'uppercase', letterSpacing:'0.5px' },
  input: { padding:'10px 14px', borderRadius:10, border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, fontSize:14, background: dark ? '#1c2333' : '#f8fafc', outline:'none', fontWeight:500, color: dark ? '#e6edf3' : '#0f172a' },
  saveBtn: { padding:'11px 28px', background:'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 12px rgba(99,102,241,0.4)' },
  cancelBtn: { padding:'11px 20px', background: dark ? '#1c2333' : '#f1f5f9', color: dark ? '#94a3b8' : '#475569', border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer' },

  filterRow: { margin:'0 32px', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' },
  searchBox: { display:'flex', alignItems:'center', gap:8, background: dark ? '#161b22' : '#fff', border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, borderRadius:12, padding:'0 14px', flex:1, maxWidth:300 },
  searchInput: { border:'none', background:'transparent', outline:'none', fontSize:13, padding:'10px 0', flex:1, color: dark ? '#e6edf3' : '#0f172a' },
  tabs: { display:'flex', gap:4, background: dark ? '#1c2333' : '#f1f5f9', padding:4, borderRadius:10, flexWrap:'wrap' },
  tab: { padding:'6px 12px', borderRadius:7, border:'none', background:'transparent', fontSize:12, fontWeight:600, color: dark ? '#8b949e' : '#64748b', cursor:'pointer' },
  tabActive: { background: dark ? '#161b22' : '#fff', color:'#6366f1', boxShadow:'0 2px 6px rgba(0,0,0,0.08)' },

  tableCard: { margin:'0 32px', background: dark ? '#161b22' : '#fff', borderRadius:20, border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}`, overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.06)' },
  table: { width:'100%', borderCollapse:'collapse' },
  thead: { background: dark ? 'linear-gradient(90deg,#161b22,#1c2333)' : 'linear-gradient(90deg,#f8fafc,#f0f4ff)' },
  th: { textAlign:'left', padding:'13px 16px', fontSize:11, fontWeight:700, color: dark ? '#8b949e' : '#64748b', textTransform:'uppercase', letterSpacing:'0.8px', borderBottom: `2px solid ${dark ? '#21262d' : '#f1f5f9'}` },
  td: { padding:'13px 16px', fontSize:13, color: dark ? '#c9d1d9' : '#374151', verticalAlign:'middle' },
  empty: { padding:'50px', textAlign:'center', color:'#94a3b8' },
  tableFooter: { padding:'12px 16px', fontSize:12, color:'#94a3b8', background: dark ? '#1c2333' : '#f8fafc', borderTop: `1px solid ${dark ? '#21262d' : '#f1f5f9'}` },
  editBtn: { padding:'5px 12px', background: dark ? 'rgba(99,102,241,0.15)' : '#eef2ff', color:'#6366f1', border: `1px solid ${dark ? '#4f46e5' : '#c7d2fe'}`, borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer' },
  delBtn: { padding:'5px 10px', background: dark ? 'rgba(220,38,38,0.12)' : '#fff0f0', color:'#dc2626', border: `1px solid ${dark ? '#dc2626' : '#fca5a5'}`, borderRadius:7, fontSize:12, cursor:'pointer' },

  modalOverlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background: dark ? '#161b22' : '#fff', borderRadius:20, padding:32, maxWidth:380, width:'90%', textAlign:'center', boxShadow:'0 24px 64px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize:18, fontWeight:800, color: dark ? '#e6edf3' : '#0f172a', marginBottom:8 },
  modalSub: { fontSize:13, color: dark ? '#8b949e' : '#64748b' },
  delConfirmBtn: { padding:'11px 24px', background:'#dc2626', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', flex:1 },
})
