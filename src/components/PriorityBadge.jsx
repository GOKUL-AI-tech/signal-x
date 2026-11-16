const ICONS  = { Critical:'🔴', High:'🟠', Medium:'🟡', Low:'🟢' }
const STYLES = {
  Critical: { color:'#dc2626', bg:'linear-gradient(135deg,#fee2e2,#fecaca)', border:'#fca5a5' },
  High:     { color:'#c2410c', bg:'linear-gradient(135deg,#ffedd5,#fed7aa)', border:'#fdba74' },
  Medium:   { color:'#92400e', bg:'linear-gradient(135deg,#fef9c3,#fef08a)', border:'#fde047' },
  Low:      { color:'#065f46', bg:'linear-gradient(135deg,#d1fae5,#a7f3d0)', border:'#6ee7b7' },
}

export default function PriorityBadge({ priority }) {
  if (!priority) return null
  const st = STYLES[priority.level] || STYLES.Low
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:'999px', background:st.bg, color:st.color, fontSize:11, fontWeight:800, border:`1px solid ${st.border}`, whiteSpace:'nowrap', letterSpacing:'0.3px' }}>
      {ICONS[priority.level]} {priority.level}
    </span>
  )
}
