/**
 * AgeBadge — shows how long a complaint has been open
 * Color escalates: green → yellow → orange → red
 */
import { useMemo } from 'react'

export default function AgeBadge({ createdAt, status }) {
  const badge = useMemo(() => {
    if (status === 'Resolved') return null

    // eslint-disable-next-line react-hooks/purity
    const hours = (Date.now() - new Date(createdAt)) / 3_600_000
    const days  = hours / 24

    let label, color, bg, border
    if (hours < 6) {
      label = `${Math.round(hours)}h ago`
      color = '#065f46'; bg = '#d1fae5'; border = '#6ee7b7'
    } else if (hours < 24) {
      label = `${Math.round(hours)}h open`
      color = '#92400e'; bg = '#fef9c3'; border = '#fde047'
    } else if (days < 3) {
      label = `${Math.round(days)}d open`
      color = '#c2410c'; bg = '#ffedd5'; border = '#fdba74'
    } else {
      label = `${Math.round(days)}d overdue`
      color = '#dc2626'; bg = '#fee2e2'; border = '#fca5a5'
    }

    return { label, color, bg, border }
  }, [createdAt, status])

  if (!badge) return null

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px',
      borderRadius: '999px',
      fontSize: 11, fontWeight: 700,
      color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`,
      whiteSpace: 'nowrap',
    }}>
      ⏱ {badge.label}
    </span>
  )
}
