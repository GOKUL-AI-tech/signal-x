/**
 * Nexus AI Analyzer — Groq LLM powered
 * Understands complaint context semantically, not just keywords.
 * Falls back to keyword engine if API key missing or call fails.
 */

import { analyzePriority } from './aiPriority.js'

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.1-8b-instant'

// In-memory cache: ticket_id → priority object
// Avoids re-calling API on every re-render
const cache = new Map()

const LEVEL_STYLE = {
  Critical: { color: '#ef4444', bg: '#fee2e2' },
  High:     { color: '#f97316', bg: '#ffedd5' },
  Medium:   { color: '#eab308', bg: '#fef9c3' },
  Low:      { color: '#10b981', bg: '#d1fae5' },
}

function buildStyle(level, score, tag) {
  const style = LEVEL_STYLE[level] || LEVEL_STYLE.Low
  return { level, score, tag, ...style }
}

/**
 * Analyze a batch of complaints in ONE API call.
 * Returns a map: ticket_id → priority object.
 */
export async function analyzeComplaintsBatch(complaints) {
  if (!complaints || complaints.length === 0) return {}

  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  const hasKey = apiKey && apiKey !== 'your-groq-api-key-here'

  // Separate what's already cached vs what needs analysis
  const toAnalyze = hasKey
    ? complaints.filter(c => !cache.has(c.ticket_id))
    : []

  // Call Groq for uncached complaints
  if (toAnalyze.length > 0) {
    const input = toAnalyze.map(c => ({
      id:   c.ticket_id,
      text: c.issue_text,
      dept: c.assigned_role,
    }))

    const prompt = `You are an AI assistant for a college complaint management system in India.
Your job: analyze student complaints and classify each by urgency priority.

Return ONLY a valid JSON array. No explanation. No markdown. Just the array.

Complaints:
${JSON.stringify(input)}

Return format (one object per complaint):
[
  {
    "id": "<ticket_id>",
    "level": "Critical" | "High" | "Medium" | "Low",
    "score": <integer 1-10>,
    "tag": "<reason in max 5 words>"
  }
]

Classification rules:
- Critical (8-10): ragging, bullying, harassment, abuse, physical violence, assault, eve teasing, threat, fight, fire, flood, medical emergency, safety hazard, sexual misconduct, discrimination
- High (6-7): exam tomorrow/today, submission deadline, entire system down, no power/water for hostel, broken equipment affecting many students, urgent admin issue, stolen item, locked out
- Medium (3-5): slow wifi, single device not working, delay in service, access issue, minor malfunction, request pending long time
- Low (1-2): general suggestion, minor inconvenience, feedback, asking for information

EMOTIONAL DETECTION — This is critical:
If a student expresses ANY of: fear, desperation, hopelessness, crying, harassment, being forced, feeling alone, mental health distress, suicidal thoughts — classify as Critical or High accordingly.
The student's emotional wellbeing takes precedence over the category of complaint.

- Critical (8-10): ragging, bullying, harassment, abuse, physical violence, assault, eve teasing, threat, fight, fire, flood, medical emergency, safety hazard, sexual misconduct, discrimination, suicidal thoughts, self-harm, mental breakdown, being physically hurt or threatened, scared/terrified of someone
- High (6-7): exam deadline, full outage, emotional distress (depressed, crying, helpless, desperate, anxious, scared), bullying/pressure by peers, feeling unsafe, no support

Consider Indian college context: ragging is ALWAYS Critical. A student expressing fear or distress about another person = at least High.`

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 800,
        }),
      })

      if (!res.ok) throw new Error(`Groq API ${res.status}`)

      const data = await res.json()
      const raw  = data.choices?.[0]?.message?.content || '[]'

      // Extract JSON array from response (handles accidental markdown)
      const match = raw.match(/\[[\s\S]*?\]/)
      if (match) {
        const results = JSON.parse(match[0])
        results.forEach(r => {
          const level = ['Critical','High','Medium','Low'].includes(r.level) ? r.level : 'Low'
          cache.set(r.id, buildStyle(level, r.score || 1, r.tag || 'AI analyzed'))
        })
      }
    } catch (err) {
      console.warn('[Nexus AI] Groq call failed, using keyword fallback:', err.message)
      // Fill cache with keyword fallback for failed ones
      toAnalyze.forEach(c => {
        if (!cache.has(c.ticket_id)) {
          cache.set(c.ticket_id, analyzePriority(c.issue_text, c.created_at, c.assigned_role))
        }
      })
    }
  }

  // Build final result map — use cache where available, keyword fallback otherwise
  const result = {}
  complaints.forEach(c => {
    result[c.ticket_id] = cache.get(c.ticket_id)
      || analyzePriority(c.issue_text, c.created_at, c.assigned_role)
  })
  return result
}

/** Invalidate cache for a ticket (call after status update) */
export function invalidateCache(ticketId) {
  cache.delete(ticketId)
}
