import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const TIMEOUT_MS  = 30 * 60 * 1000  // 30 minutes
const WARNING_MS  = 2  * 60 * 1000  // warn 2 min before

export default function SessionTimeout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const timerRef   = useRef(null)
  const warnRef    = useRef(null)
  const [warning, setWarning] = useState(false)
  const [countdown, setCountdown] = useState(120)
  const cdRef = useRef(null)

  const reset = () => {
    setWarning(false)
    clearTimeout(timerRef.current)
    clearTimeout(warnRef.current)
    clearInterval(cdRef.current)
    if (!user) return
    warnRef.current = setTimeout(() => {
      setWarning(true)
      setCountdown(120)
      cdRef.current = setInterval(() => setCountdown(c => c - 1), 1000)
    }, TIMEOUT_MS - WARNING_MS)
    timerRef.current = setTimeout(() => {
      logout(); navigate('/')
    }, TIMEOUT_MS)
  }

  useEffect(() => {
    if (!user) { clearTimeout(timerRef.current); clearTimeout(warnRef.current); clearInterval(cdRef.current); setWarning(false); return } // eslint-disable-line react-hooks/set-state-in-effect
    const events = ['mousemove','keydown','click','scroll','touchstart']
    const handler = () => reset()
    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    reset()
    return () => {
      events.forEach(e => window.removeEventListener(e, handler))
      clearTimeout(timerRef.current); clearTimeout(warnRef.current); clearInterval(cdRef.current)
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!warning || !user) return null

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={{ fontSize:40, marginBottom:10 }}>⏰</div>
        <div style={s.title}>Session expiring soon</div>
        <div style={s.sub}>You will be signed out in <strong style={{ color:'#ef4444' }}>{countdown}s</strong> due to inactivity.</div>
        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <button style={s.stayBtn} onClick={reset}>Stay Signed In</button>
          <button style={s.outBtn} onClick={() => { logout(); navigate('/') }}>Sign Out Now</button>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 },
  modal: { background:'#fff', borderRadius:20, padding:32, maxWidth:380, width:'90%', textAlign:'center', boxShadow:'0 24px 64px rgba(0,0,0,0.3)' },
  title: { fontSize:20, fontWeight:800, color:'#0f172a', marginBottom:8 },
  sub: { fontSize:14, color:'#64748b', lineHeight:1.6 },
  stayBtn: { flex:1, padding:'12px', background:'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff', border:'none', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 12px rgba(99,102,241,0.35)' },
  outBtn: { flex:1, padding:'12px', background:'#f1f5f9', color:'#475569', border:'2px solid #e2e8f0', borderRadius:12, fontSize:14, fontWeight:600, cursor:'pointer' },
}
