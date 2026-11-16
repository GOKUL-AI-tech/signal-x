import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDarkMode } from '../context/DarkModeContext'

const ROLE_COLORS = {
  STUDENT: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
  FACULTY: 'linear-gradient(135deg,#ec4899,#f43f5e)',
  HOD:     'linear-gradient(135deg,#06b6d4,#0ea5e9)',
  STAFF:   'linear-gradient(135deg,#10b981,#059669)',
  ADMIN:   'linear-gradient(135deg,#f59e0b,#f97316)',
}

export default function Sidebar({ links }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const { dark, toggle } = useDarkMode()
  const avatarGrad = ROLE_COLORS[user?.role] || ROLE_COLORS.STUDENT

  return (
    <div style={s.sidebar}>
      {/* Glow blob */}
      <div style={s.glow} />

      {/* Brand */}
      <div style={s.brand}>
        <div style={s.logoWrap}>
          <img src="/logo.png" alt="logo" style={s.logo} />
          <div style={s.logoRing} />
        </div>
        <div>
          <div style={s.brandName}>Nexus</div>
          <div style={s.brandSub}>Nehru Arts & Science</div>
        </div>
      </div>

      {/* Divider */}
      <div style={s.divider} />

      {/* User card */}
      <div style={s.userCard}>
        <div style={{ ...s.avatar, background: avatarGrad }}>
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <div style={s.userInfo}>
          <div style={s.userName}>{user?.username}</div>
          <div style={s.userRole}>{user?.role}{user?.department ? ` · ${user.department.replace('_',' ')}` : ''}</div>
        </div>
        <div style={{ ...s.onlineDot }} />
      </div>

      <div style={s.divider} />

      {/* Nav links */}
      <nav style={s.nav}>
        <div style={s.navLabel}>NAVIGATION</div>
        {links.map((link) => {
          const active = location.pathname === link.to
          return (
            <Link key={link.to} to={link.to} style={{ ...s.navLink, ...(active ? s.navActive : {}) }}>
              {active && <div style={s.activePill} />}
              <span style={s.navIcon}>{link.icon}</span>
              <span style={s.navText}>{link.label}</span>
              {active && <span style={s.activeArrow}>›</span>}
            </Link>
          )
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Bottom */}
      <div style={s.bottom}>
        <button onClick={toggle} style={s.darkToggle}>
          {dark ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
        <div style={s.versionTag}>v2.0 · AI Powered</div>
        <button onClick={() => { logout(); navigate('/') }} style={s.logoutBtn}>
          <span>🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}

const s = {
  sidebar: {
    width: '260px',
    minWidth: '260px',
    minHeight: '100vh',
    background: 'linear-gradient(180deg,#0f0c29 0%,#302b63 50%,#24243e 100%)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: '-60px', left: '-60px',
    width: '200px', height: '200px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '8px 4px', marginBottom: '4px', position: 'relative', zIndex: 1,
  },
  logoWrap: { position: 'relative', flexShrink: 0 },
  logo: {
    width: '46px', height: '46px', borderRadius: '12px',
    objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)',
    position: 'relative', zIndex: 1,
  },
  logoRing: {
    position: 'absolute', inset: '-3px', borderRadius: '14px',
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    zIndex: 0, opacity: 0.6,
  },
  brandName: { color: '#fff', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' },
  brandSub: { color: '#7c7fa8', fontSize: '10px', fontWeight: 500, marginTop: '1px' },
  divider: { height: '1px', background: 'rgba(255,255,255,0.07)', margin: '14px 0' },
  userCard: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '12px', padding: '10px 12px',
    border: '1px solid rgba(255,255,255,0.08)',
    position: 'relative',
  },
  avatar: {
    width: '38px', height: '38px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: '16px', color: '#fff', flexShrink: 0,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { color: '#f0f0ff', fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userRole: { color: '#7c7fa8', fontSize: '10px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px' },
  onlineDot: {
    width: '8px', height: '8px', borderRadius: '50%',
    background: '#10b981', flexShrink: 0,
    boxShadow: '0 0 6px #10b981',
  },
  nav: { display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '8px' },
  navLabel: { color: '#4a4a6a', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', padding: '6px 12px', marginBottom: '4px' },
  navLink: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '11px 12px', borderRadius: '10px',
    color: '#8888aa', fontWeight: 500, fontSize: '14px',
    position: 'relative', overflow: 'hidden',
    transition: 'all 0.2s',
  },
  navActive: {
    background: 'linear-gradient(90deg,rgba(99,102,241,0.25),rgba(139,92,246,0.1))',
    color: '#a5b4fc',
    border: '1px solid rgba(99,102,241,0.3)',
  },
  activePill: {
    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
    width: '3px', height: '60%', background: 'linear-gradient(180deg,#6366f1,#8b5cf6)',
    borderRadius: '0 4px 4px 0',
  },
  navIcon: { fontSize: '18px', width: '22px', textAlign: 'center', flexShrink: 0 },
  navText: { flex: 1 },
  activeArrow: { color: '#6366f1', fontWeight: 700, fontSize: '18px' },
  bottom: { display: 'flex', flexDirection: 'column', gap: '8px' },
  versionTag: {
    textAlign: 'center', fontSize: '10px', color: '#4a4a6a',
    padding: '6px', background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px', letterSpacing: '0.5px',
  },
  darkToggle: {
    display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
    padding:'9px', background:'rgba(255,255,255,0.06)',
    border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:'10px', color:'#a5b4fc',
    fontWeight:600, fontSize:'12px', cursor:'pointer', width:'100%',
  },
  logoutBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '11px', background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: '10px', color: '#fca5a5',
    fontWeight: 600, fontSize: '13px',
  },
}
