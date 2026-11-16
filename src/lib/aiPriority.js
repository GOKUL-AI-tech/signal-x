/**
 * Nexus AI Priority Engine
 * Analyzes complaint text + age to compute urgency level
 */

const RULES = [
  // Critical — safety / physical threat
  {
    keywords: [
      'emergency', 'fire', 'flood', 'accident', 'danger', 'medical', 'injury', 'unsafe',
      'electric', 'short circuit', 'attack', 'assault', 'fight', 'violence', 'threat',
      'harassment', 'abuse', 'ragging', 'raged', 'bullying', 'bully', 'molest', 'eve teasing',
      // Emotional distress signals → auto-Critical
      'suicide', 'suicidal', 'want to die', 'kill myself', 'end my life', 'harm myself',
      'hurt myself', 'scared', 'terrified', 'being beaten', 'physically hurt', 'molested',
      'sexual assault', 'mentally tortured', 'stripped', 'threatened to kill',
    ],
    score: 5,
    tag: 'Safety / Harassment alert',
  },
  // Critical — complete outage
  {
    keywords: [
      'not working', 'completely broken', 'no internet', 'no power', 'server down',
      'all computers', 'entire lab', 'total failure', 'no water', 'no electricity',
    ],
    score: 4,
    tag: 'Complete service outage',
  },
  // High — exam / time-sensitive
  {
    keywords: [
      'exam', 'test', 'viva', 'practical', 'submission', 'deadline', 'tomorrow', 'today',
      'urgent', 'immediately', 'asap', 'right now', 'very urgent', 'hurry', 'desperate',
      'serious', 'severely', 'very bad', 'worst', 'terrible',
    ],
    score: 3,
    tag: 'Urgent / Time-sensitive',
  },
  // High — service broken
  {
    keywords: [
      'broken', 'failed', 'failure', 'crash', 'not available', 'blocked', 'locked',
      'stolen', 'missing', 'damaged', 'not working', 'stopped working', 'leaking', 'burst',
      'no signal', 'disconnected', 'angry', 'frustrated', 'unfair', 'injustice',
    ],
    score: 2,
    tag: 'Service disruption',
  },
  // Medium
  {
    keywords: [
      'slow', 'delay', 'problem', 'issue', 'not responding', 'error', 'cannot', "can't",
      'unable', 'complaint', 'request', 'please fix', 'need help', 'facing issue',
    ],
    score: 1,
    tag: 'Needs attention',
  },
]

const DEPT_WEIGHTS = {
  IT_SUPPORT: 1,
  LAB_INCHARGE: 1.5,  // labs affect many students
  TRANSPORT: 1.2,
  HOSTEL: 1.3,
  OFFICE: 1,
  LIBRARIAN: 0.8,
  FACULTY: 1,
}

export function analyzePriority(issueText, createdAt, assignedRole) {
  if (!issueText) return { level: 'Low', color: '#10b981', bg: '#d1fae5', score: 0, tag: 'Standard complaint' }

  const text = issueText.toLowerCase()
  let score = 0
  let tags = []

  // Keyword scoring
  for (const rule of RULES) {
    if (rule.keywords.some((k) => text.includes(k))) {
      score += rule.score
      tags.push(rule.tag)
      break // only highest matching rule
    }
  }

  // Department weight
  const deptWeight = DEPT_WEIGHTS[assignedRole] || 1
  score = score * deptWeight

  // Age factor — older unresolved complaints get escalated
  if (createdAt) {
    const ageHours = (Date.now() - new Date(createdAt)) / 3_600_000
    if (ageHours > 72) {
      score += 2
      tags.push('Pending 3+ days')
    } else if (ageHours > 24) {
      score += 1
      tags.push('Pending 24h+')
    }
  }

  const tag = tags.length ? tags[0] : 'Standard complaint'

  if (score >= 5) return { level: 'Critical', color: '#ef4444', bg: '#fee2e2', score, tag }
  if (score >= 3) return { level: 'High',     color: '#f97316', bg: '#ffedd5', score, tag }
  if (score >= 1) return { level: 'Medium',   color: '#eab308', bg: '#fef9c3', score, tag }
  return              { level: 'Low',         color: '#10b981', bg: '#d1fae5', score, tag }
}

export function sortByPriority(complaints) {
  return [...complaints].sort((a, b) => {
    const pa = analyzePriority(a.issue_text, a.created_at, a.assigned_role)
    const pb = analyzePriority(b.issue_text, b.created_at, b.assigned_role)
    return pb.score - pa.score
  })
}
