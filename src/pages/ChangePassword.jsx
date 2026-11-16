import { useState } from 'react'
import { useDarkMode } from '../context/DarkModeContext'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ChangePassword() {
  const { dark } = useDarkMode()
  const s = makeStyles(dark)
  const [form, setForm] = useState({ username: '', oldPassword: '', newPassword: '' })
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', form.username)
      .eq('password', form.oldPassword)
      .single()

    if (error || !data) {
      setMessage({ type: 'error', text: 'Wrong username or current password.' })
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ password: form.newPassword })
      .eq('id', data.id)

    setLoading(false)
    setMessage(updateError
      ? { type: 'error', text: 'Update failed. Please try again.' }
      : { type: 'success', text: 'Password updated successfully! You can now login.' }
    )
    if (!updateError) setForm({ username: '', oldPassword: '', newPassword: '' })
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.icon}>🔐</div>
        <h2 style={s.heading}>Change Password</h2>
        <p style={s.sub}>Enter your current password to set a new one</p>

        {message && (
          <div style={{
            ...s.msgBox,
            background: message.type === 'success' ? (dark?'rgba(16,185,129,0.12)':'#d1fae5') : (dark?'rgba(220,38,38,0.12)':'#fee2e2'),
            color: message.type === 'success' ? (dark?'#34d399':'#065f46') : (dark?'#fca5a5':'#dc2626'),
            border: `1px solid ${message.type === 'success' ? (dark?'#059669':'#6ee7b7') : (dark?'#ef4444':'#fca5a5')}`,
          }}>
            {message.type === 'success' ? '✅' : '⚠️'} {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
          {[
            { label: 'Username',         key: 'username',    type: 'text',     placeholder: 'Your username' },
            { label: 'Current Password', key: 'oldPassword', type: 'password', placeholder: 'Current password' },
            { label: 'New Password',     key: 'newPassword', type: 'password', placeholder: 'New password' },
          ].map(f => (
            <div key={f.key} style={s.field}>
              <label style={s.label}>{f.label}</label>
              <input
                style={s.input}
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                required
              />
            </div>
          ))}

          <button type="submit" style={s.submit} disabled={loading}>
            {loading ? 'Updating…' : 'Update Password'}
          </button>
        </form>

        <Link to="/" style={s.back}>← Back to Login</Link>
      </div>
    </div>
  )
}

const makeStyles = (dark) => ({
  page: { display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, #0f172a 0%, #1e3a5f 50%, #1e293b 100%)' },
  card: { background: dark ? '#161b22' : '#fff', padding: '44px 40px', borderRadius: '20px', width: '420px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' },
  icon: { fontSize: '40px', marginBottom: '16px' },
  heading: { fontSize: '24px', fontWeight: 700, color: dark ? '#e6edf3' : '#0f172a', marginBottom: '6px' },
  sub: { color: dark ? '#8b949e' : '#64748b', fontSize: '14px', marginBottom: '4px' },
  msgBox: { padding: '12px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, marginTop: '16px' },
  field: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 600, color: dark ? '#c9d1d9' : '#374151', marginBottom: '6px' },
  input: { width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1.5px solid ${dark ? '#30363d' : '#e2e8f0'}`, fontSize: '14px', background: dark ? '#1c2333' : '#f8fafc', color: dark ? '#e6edf3' : '#0f172a', boxSizing: 'border-box', outline: 'none' },
  submit: { width: '100%', padding: '13px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, marginTop: '8px', boxShadow: '0 4px 15px rgba(99,102,241,0.4)' },
  back: { display: 'block', textAlign: 'center', marginTop: '20px', color: '#6366f1', fontSize: '14px', fontWeight: 500 },
})
