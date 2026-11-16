import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { useDarkMode } from '../context/DarkModeContext'

const DEPARTMENTS = [
  { icon:'💻', label:'IT Support',   value:'IT_SUPPORT',   desc:'WiFi, computers, projectors, software issues', grad:'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#6366f1', bg:'#eef2ff' },
  { icon:'🧪', label:'Lab Incharge', value:'LAB_INCHARGE', desc:'Lab equipment, chemicals, machinery, maintenance', grad:'linear-gradient(135deg,#8b5cf6,#7c3aed)', color:'#8b5cf6', bg:'#f5f3ff' },
  { icon:'📚', label:'Library',      value:'LIBRARIAN',    desc:'Books, reading room, borrowing & return issues', grad:'linear-gradient(135deg,#0ea5e9,#0284c7)', color:'#0ea5e9', bg:'#e0f2fe' },
  { icon:'🚌', label:'Transport',    value:'TRANSPORT',    desc:'Bus routes, timing, vehicle & driver complaints', grad:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#f59e0b', bg:'#fef3c7' },
  { icon:'🏠', label:'Hostel',       value:'HOSTEL',       desc:'Room, mess, water, electricity, cleanliness', grad:'linear-gradient(135deg,#10b981,#059669)', color:'#10b981', bg:'#d1fae5' },
  { icon:'🏢', label:'Office',       value:'OFFICE',       desc:'Fees, certificates, ID cards, administration', grad:'linear-gradient(135deg,#64748b,#475569)', color:'#64748b', bg:'#f1f5f9' },
  { icon:'👨‍🏫', label:'Faculty',     value:'FACULTY',      desc:'Academic issues, class schedules, faculty concerns', grad:'linear-gradient(135deg,#ec4899,#db2777)', color:'#ec4899', bg:'#fce7f3' },
]

export default function Departments() {
  const navigate = useNavigate()
  const { dark } = useDarkMode()
  const s = makeStyles(dark)

  return (
    <div style={s.layout}>
      <Sidebar links={[
        { to:'/student',       icon:'🏠', label:'Dashboard' },
        { to:'/my-complaints', icon:'📋', label:'My Complaints' },
        { to:'/departments',   icon:'🏢', label:'Departments' },
        { to:'/announce',      icon:'📢', label:'Announcements' },
      ]} />

      <div style={s.main}>
        {/* Hero */}
        <div style={s.hero}>
          <div style={s.heroPattern} />
          <div style={s.heroContent}>
            <p style={s.heroSub}>🏢 Department Directory</p>
            <h1 style={s.heroTitle}>Choose Your Department</h1>
            <p style={s.heroDesc}>Submit a targeted complaint directly to the right team</p>
          </div>
        </div>

        <div style={s.grid}>
          {DEPARTMENTS.map((dept) => (
            <div key={dept.value} style={s.card}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-6px)'; e.currentTarget.style.boxShadow='0 20px 48px rgba(0,0,0,0.12)' }}
              onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.06)' }}
            >
              {/* Colored top bar */}
              <div style={{ height:4, background:dept.grad, borderRadius:'20px 20px 0 0', margin:'-24px -24px 20px' }} />

              <div style={{ ...s.iconBox, background:dept.bg }}>
                <span style={s.iconEmoji}>{dept.icon}</span>
              </div>

              <h3 style={s.deptLabel}>{dept.label}</h3>
              <p style={s.deptDesc}>{dept.desc}</p>

              <button
                style={{ ...s.openBtn, background:dept.grad }}
                onClick={() => navigate(`/student?dept=${dept.value}`)}
              >
                Submit Complaint →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const makeStyles = (dark) => ({
  layout: { display:'flex', minHeight:'100vh', background: dark ? '#0d1117' : '#f0f2f8' },
  main: { flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:0, paddingBottom:32, overflow:'hidden' },
  hero: { position:'relative', overflow:'hidden', padding:'40px 32px 36px', background:'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)', marginBottom:32 },
  heroPattern: { position:'absolute', inset:0, opacity:0.05, backgroundImage:'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize:'20px 20px' },
  heroContent: { position:'relative', zIndex:1 },
  heroSub: { color:'#a5b4fc', fontSize:11, fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', marginBottom:8 },
  heroTitle: { color:'#fff', fontSize:32, fontWeight:800, marginBottom:8 },
  heroDesc: { color:'#7c7fa8', fontSize:15 },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20, padding:'0 32px' },
  card: {
    background: dark ? '#161b22' : '#fff', borderRadius:20, padding:24,
    border: `1px solid ${dark ? '#30363d' : '#e2e8f0'}`, boxShadow:'0 4px 16px rgba(0,0,0,0.06)',
    transition:'all 0.25s', display:'flex', flexDirection:'column', gap:12,
    cursor:'default', overflow:'hidden',
  },
  iconBox: { width:56, height:56, borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  iconEmoji: { fontSize:28 },
  deptLabel: { fontSize:17, fontWeight:800, color: dark ? '#e6edf3' : '#0f172a' },
  deptDesc: { fontSize:13, color: dark ? '#8b949e' : '#64748b', lineHeight:1.6, flex:1 },
  openBtn: { marginTop:8, padding:'12px 20px', color:'#fff', border:'none', borderRadius:12, fontWeight:700, fontSize:14, alignSelf:'flex-start', boxShadow:'0 6px 20px rgba(0,0,0,0.15)', letterSpacing:'0.3px' },
})
