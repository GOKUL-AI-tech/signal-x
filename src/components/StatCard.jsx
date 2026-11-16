export default function StatCard({ icon, label, value, gradient, sub }) {
  return (
    <div style={{ ...s.card, background: gradient }}>
      <div style={s.iconWrap}>{icon}</div>
      <div style={s.value}>{value}</div>
      <div style={s.label}>{label}</div>
      {sub && <div style={s.sub}>{sub}</div>}
    </div>
  )
}

const s = {
  card: {
    flex: 1, minWidth: '130px', borderRadius: '18px', padding: '22px 18px',
    display: 'flex', flexDirection: 'column', gap: '6px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    position: 'relative', overflow: 'hidden',
  },
  iconWrap: { fontSize: '28px', marginBottom: '4px' },
  value: { fontSize: '32px', fontWeight: 800, color: '#fff', lineHeight: 1 },
  label: { fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  sub: { fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' },
}
