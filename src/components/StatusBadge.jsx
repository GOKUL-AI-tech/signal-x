const STATUS = {
  'New':          { color:'#dc2626', bg:'linear-gradient(135deg,#fee2e2,#fecaca)', border:'#fca5a5', dot:'#ef4444' },
  'Under Review': { color:'#c2410c', bg:'linear-gradient(135deg,#ffedd5,#fed7aa)', border:'#fdba74', dot:'#f97316' },
  'Resolved':     { color:'#065f46', bg:'linear-gradient(135deg,#d1fae5,#a7f3d0)', border:'#6ee7b7', dot:'#10b981' },
}

export default function StatusBadge({ status }) {
  const st = STATUS[status] || { color:'#64748b', bg:'#f1f5f9', border:'#e2e8f0', dot:'#94a3b8' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:'999px', background:st.bg, color:st.color, fontSize:11, fontWeight:700, border:`1px solid ${st.border}`, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:st.dot, flexShrink:0, boxShadow:`0 0 4px ${st.dot}` }} />
      {status}
    </span>
  )
}
