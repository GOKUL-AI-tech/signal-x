import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useDarkMode } from '../context/DarkModeContext'

const ROLES = [
  { id: 'STUDENT', label: 'Student',   icon: '🎓', grad: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  { id: 'HOD',     label: 'Staff',     icon: '👨‍💼', grad: 'linear-gradient(135deg,#06b6d4,#0ea5e9)' },
  { id: 'ADMIN',   label: 'Principal', icon: '👑', grad: 'linear-gradient(135deg,#f59e0b,#f97316)' },
]

export default function Login() {
  const [username, setUsername]       = useState('')
  const [password, setPassword]       = useState('')
  const [selectedRole, setRole]       = useState('STUDENT')
  const [showPass, setShowPass]       = useState(false)
  const [message, setMessage]         = useState('')
  const [loading, setLoading]         = useState(false)

  const { login } = useAuth()
  const { dark } = useDarkMode()
  const s = makeStyles(dark)
  const navigate  = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase
      .from('users').select('*')
      .eq('username', username).eq('password', password).single()

    setLoading(false)

    if (error || !data) { setMessage('Invalid username or password'); return }

    // Role button → allowed actual roles
    const visibleMap = { STUDENT: ['STUDENT'], HOD: ['HOD', 'STAFF', 'FACULTY'], ADMIN: ['ADMIN'] }
    if (visibleMap[selectedRole] && !visibleMap[selectedRole].includes(data.role)) {
      setMessage('Incorrect role selected for this account.'); return
    }

    login({ username: data.username, role: data.role, department: data.department })

    if (data.role === 'STUDENT')                             navigate('/student')
    else if (data.role === 'ADMIN')                          navigate('/admin')
    else if (data.role === 'HOD')                            navigate('/hod')
    else if (data.role === 'STAFF' || data.role === 'FACULTY') navigate('/staff')
    else setMessage('Unknown account type.')
  }

  const activeRole = ROLES.find(r => r.id === selectedRole)

  return (
    <div style={s.page}>

      {/* ── LEFT ── */}
      <div style={s.left}>
        <div style={s.leftBg} />
        <div style={s.leftBlob1} />
        <div style={s.leftBlob2} />

        <div style={s.leftContent}>
          <div style={s.logoRingWrap}>
            <div style={s.logoRing} />
            <img src="/logo.png" alt="logo" style={s.collegeLogo} />
          </div>

          <h1 style={s.collegeName}>Nehru Arts &amp;<br />Science College</h1>
          <p style={s.collegeLocation}>📍 Coimbatore, Tamil Nadu</p>

          <div style={s.tagRow}>
            <div style={s.tagLine} />
            <span style={s.tagText}>COMPLAINT MANAGEMENT PORTAL</span>
            <div style={s.tagLine} />
          </div>

          <div style={s.featureList}>
            {[
              { icon: '🚀', text: 'Submit complaints in seconds' },
              { icon: '📊', text: 'Real-time status tracking' },
              { icon: '🤖', text: 'AI-powered priority detection' },
              { icon: '🔒', text: 'Secure role-based access' },
            ].map(f => (
              <div key={f.text} style={s.feature}>
                <div style={s.featureIcon}>{f.icon}</div>
                <span style={s.featureText}>{f.text}</span>
              </div>
            ))}
          </div>

          <div style={s.statsRow}>
            {[['7+','Departments'],['3','Access Levels'],['AI','Priority Engine']].map(([n,l]) => (
              <div key={l} style={s.stat}>
                <div style={s.statNum}>{n}</div>
                <div style={s.statLbl}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div style={s.right}>
        <div style={s.card}>
          {/* Header */}
          <div style={s.cardHead}>
            <div style={{ ...s.roleGradBadge, background: activeRole?.grad }}>
              {activeRole?.icon}
            </div>
            <div>
              <h2 style={s.heading}>Welcome Back</h2>
              <p style={s.subheading}>Sign in to your Nexus account</p>
            </div>
          </div>

          {/* Role selector */}
          <p style={s.roleLabel}>LOGIN AS</p>
          <div style={s.roleRow}>
            {ROLES.map(r => (
              <button
                key={r.id} type="button"
                onClick={() => setRole(r.id)}
                style={{
                  ...s.roleBtn,
                  ...(selectedRole === r.id ? { ...s.roleBtnActive, background: r.grad, borderColor: 'transparent' } : {})
                }}
              >
                <span style={s.roleBtnIcon}>{r.icon}</span>
                <span style={{ ...s.roleBtnLabel, color: selectedRole === r.id ? '#fff' : (dark ? '#8b949e' : '#64748b') }}>{r.label}</span>
              </button>
            ))}
          </div>

          {/* Staff hint */}
          <div style={s.staffHint}>
            <span style={s.hintIcon}>🔒</span>
            <span>HOD, Staff &amp; Faculty — select <strong>Staff</strong> above before signing in</span>
          </div>

          {/* Error */}
          {message && (
            <div style={s.error}>
              <span>⚠️</span> {message}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={s.fieldLabel}>Username</label>
              <div style={s.inputWrap}>
                <span style={s.inputIcon}>👤</span>
                <input
                  style={s.input}
                  type="text" placeholder="Enter your username" autoComplete="off"
                  value={username} onChange={e => setUsername(e.target.value)} required
                />
              </div>
            </div>

            <div>
              <label style={s.fieldLabel}>Password</label>
              <div style={s.inputWrap}>
                <span style={s.inputIcon}>🔑</span>
                <input
                  style={s.input}
                  type={showPass ? 'text' : 'password'} placeholder="Enter your password" autoComplete="new-password"
                  value={password} onChange={e => setPassword(e.target.value)} required
                />
                <span style={s.eyeBtn} onClick={() => setShowPass(!showPass)}>
                  {showPass ? '🙈' : '👁️'}
                </span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <Link to="/change-password" style={s.forgot}>Forgot password?</Link>
            </div>

            <button type="submit" style={{ ...s.submitBtn, background: activeRole?.grad || 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} disabled={loading}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={s.spinner} />  Signing in…
                </span>
              ) : `Sign In as ${activeRole?.label || 'Staff'} →`}
            </button>
          </form>
        </div>

        <p style={s.footer}>© 2026 Nehru Arts & Science College · Nexus v2.0</p>
      </div>
    </div>
  )
}

const makeStyles = (dark) => ({
  page: { display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 },

  /* Left panel */
  left: {
    flex: 1, position: 'relative', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh',
  },
  leftBg: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(145deg,#0f0c29 0%,#302b63 50%,#24243e 100%)',
  },
  leftBlob1: {
    position: 'absolute', top: '-80px', right: '-80px',
    width: '350px', height: '350px', borderRadius: '50%',
    background: 'radial-gradient(circle,rgba(99,102,241,0.4) 0%,transparent 70%)',
    pointerEvents: 'none',
  },
  leftBlob2: {
    position: 'absolute', bottom: '-60px', left: '-60px',
    width: '280px', height: '280px', borderRadius: '50%',
    background: 'radial-gradient(circle,rgba(139,92,246,0.3) 0%,transparent 70%)',
    pointerEvents: 'none',
  },
  leftContent: { position: 'relative', zIndex: 1, padding: '40px', maxWidth: '420px', textAlign: 'center' },
  logoRingWrap: { position: 'relative', width: '120px', height: '120px', margin: '0 auto 28px' },
  logoRing: {
    position: 'absolute', inset: '-4px', borderRadius: '28px',
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4)',
    opacity: 0.8,
  },
  collegeLogo: {
    width: '120px', height: '120px', borderRadius: '24px',
    objectFit: 'cover', position: 'relative', zIndex: 1,
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  collegeName: { color: '#fff', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.3, marginBottom: '8px' },
  collegeLocation: { color: '#7c7fa8', fontSize: '14px', marginBottom: '28px' },
  tagRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' },
  tagLine: { flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' },
  tagText: { color: '#a5b4fc', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', whiteSpace: 'nowrap' },
  featureList: { display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', marginBottom: '28px' },
  feature: { display: 'flex', alignItems: 'center', gap: '12px' },
  featureIcon: {
    width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
    background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '18px', border: '1px solid rgba(255,255,255,0.1)',
  },
  featureText: { color: '#cbd5e1', fontSize: '14px' },
  statsRow: { display: 'flex', gap: '12px', justifyContent: 'center' },
  stat: {
    flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: '12px',
    padding: '14px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center',
  },
  statNum: { color: '#a5b4fc', fontWeight: 800, fontSize: '20px' },
  statLbl: { color: '#7c7fa8', fontSize: '10px', marginTop: '2px', letterSpacing: '0.5px' },

  /* Right panel */
  right: {
    width: '45%', minWidth: '480px', background: dark ? '#0d1117' : '#f0f2f8',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '40px 48px', height: '100vh', overflowY: 'auto',
  },
  card: {
    background: dark ? '#161b22' : '#fff', borderRadius: '28px',
    padding: '44px 40px', width: '100%', maxWidth: '520px',
    boxShadow: '0 12px 60px rgba(0,0,0,0.12)',
    border: `1px solid ${dark ? '#30363d' : 'rgba(255,255,255,0.8)'}`,
  },
  cardHead: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' },
  roleGradBadge: {
    width: '64px', height: '64px', borderRadius: '18px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '32px', flexShrink: 0, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
  },
  heading: { fontSize: '28px', fontWeight: 800, color: dark ? '#e6edf3' : '#0f172a', marginBottom: '4px' },
  subheading: { color: dark ? '#8b949e' : '#64748b', fontSize: '15px' },

  roleLabel: { fontSize: '12px', fontWeight: 700, color: '#94a3b8', letterSpacing: '1.5px', marginBottom: '12px' },
  roleRow: { display: 'flex', gap: '10px', marginBottom: '14px' },
  roleBtn: {
    flex: 1, padding: '16px 8px', borderRadius: '14px',
    border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`, background: dark ? '#1c2333' : '#f8fafc',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
  },
  roleBtnActive: { boxShadow: '0 8px 24px rgba(99,102,241,0.35)' },
  roleBtnIcon: { fontSize: '28px' },
  roleBtnLabel: { fontSize: '13px', fontWeight: 700 },

  staffHint: {
    display: 'flex', alignItems: 'flex-start', gap: '8px',
    background: dark ? 'rgba(59,130,246,0.08)' : 'linear-gradient(90deg,#f0f9ff,#eff6ff)',
    border: `1px solid ${dark ? '#1d3a5f' : '#bfdbfe'}`, borderRadius: '10px',
    padding: '10px 12px', fontSize: '12px', color: dark ? '#60a5fa' : '#3b82f6',
    marginBottom: '4px', fontWeight: 500,
  },
  hintIcon: { fontSize: '14px', flexShrink: 0, marginTop: '1px' },

  error: {
    background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
    borderRadius: '10px', padding: '10px 14px', fontSize: '13px',
    fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px',
    marginTop: '4px',
  },

  fieldLabel: { display: 'block', fontSize: '13px', fontWeight: 700, color: dark ? '#c9d1d9' : '#374151', marginBottom: '8px', letterSpacing: '0.3px' },
  inputWrap: {
    display: 'flex', alignItems: 'center', gap: '12px',
    background: dark ? '#1c2333' : '#f8fafc', border: `2px solid ${dark ? '#30363d' : '#e2e8f0'}`,
    borderRadius: '14px', padding: '0 16px',
    transition: 'border-color 0.2s',
  },
  inputIcon: { fontSize: '18px', flexShrink: 0 },
  input: {
    flex: 1, border: 'none', background: 'transparent',
    outline: 'none', fontSize: '16px', padding: '15px 0',
    color: dark ? '#e6edf3' : '#0f172a',
  },
  eyeBtn: { cursor: 'pointer', fontSize: '18px', flexShrink: 0 },
  forgot: { fontSize: '14px', color: '#6366f1', fontWeight: 600 },

  submitBtn: {
    width: '100%', padding: '17px', border: 'none',
    borderRadius: '14px', color: '#fff', fontSize: '17px',
    fontWeight: 800, letterSpacing: '0.3px',
    boxShadow: '0 8px 32px rgba(99,102,241,0.45)',
  },
  spinner: {
    width: '16px', height: '16px', borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff', display: 'inline-block',
    animation: 'spin 0.8s linear infinite',
  },
  footer: { marginTop: '20px', fontSize: '11px', color: dark ? '#6e7681' : '#94a3b8', textAlign: 'center' },
})
