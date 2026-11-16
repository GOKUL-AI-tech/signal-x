/**
 * Nexus Emotional Distress Detector
 * Real-time scan of complaint text for emotional signals.
 * Used in StudentDashboard while typing — shows compassionate banner.
 */

const DISTRESS_LEVELS = [
  {
    level: 'crisis',
    keywords: [
      // Self-harm / mental health crisis
      'want to die', 'kill myself', 'end my life', 'suicide', 'suicidal',
      'no reason to live', 'cannot go on', "can't go on", 'give up on life',
      'harm myself', 'hurt myself',
      // Severe ragging / assault
      'ragging', 'being ragged', 'seniors are forcing', 'forced me', 'physically hurt',
      'stripped', 'beaten', 'hit me', 'slapped', 'kicked', 'locked in room',
      'threatened to kill', 'threatening me',
      // Sexual
      'molested', 'sexual assault', 'touched inappropriately', 'eve teasing', 'groping',
    ],
    color: '#dc2626',
    bg: '#fff0f0',
    border: '#fca5a5',
    icon: '🆘',
    title: 'We hear you — you are not alone',
    message: 'This sounds very serious. Your complaint will be marked Critical and escalated to the Principal immediately. Please also reach out to your nearest faculty or contact the college counselor right away.',
    priorityBoost: 10,
  },
  {
    level: 'distress',
    keywords: [
      // Emotional distress
      'scared', 'afraid', 'terrified', 'fear', 'fearful', 'panic', 'panicking',
      'traumatized', 'traumatic', 'nightmare', 'crying', 'sobbing', 'broke down',
      'cannot sleep', "can't sleep", 'not eating', 'not able to eat',
      'please help me', 'help me please', 'i need help', 'nobody listens',
      'no one cares', 'feeling hopeless', 'helpless', 'desperate', 'depressed',
      'anxiety', 'anxious', 'mental health', 'breakdown', 'lost my mind',
      // Bullying / social threat
      'bullied', 'bullying', 'being bullied', 'mocked', 'humiliated', 'embarrassed me',
      'spreading rumors', 'cyberbully', 'harassment', 'being harassed',
      'mentally tortured', 'mental torture', 'psychological', 'abusing me',
      'abused', 'verbal abuse', 'shouting at me', 'yelling at me',
    ],
    color: '#c2410c',
    bg: '#fff7ed',
    border: '#fb923c',
    icon: '💛',
    title: 'We care about your wellbeing',
    message: 'Your feelings matter. This complaint will be treated as High Priority. A college counselor or HOD will be notified. You are safe to express everything here.',
    priorityBoost: 6,
  },
  {
    level: 'urgent',
    keywords: [
      'unfair', 'injustice', 'not fair', 'biased', 'discrimination', 'discriminated',
      'suffering', 'suffer', 'struggling', 'very stressed', 'extremely stressed',
      'pressure', 'forced to', 'being forced', 'no choice', 'no option',
      'this is wrong', 'this cannot continue', 'cannot bear', "can't bear",
      'unbearable', 'intolerable', 'please do something', 'nothing is being done',
      'ignored', 'no response', 'nobody responded', 'no action taken',
    ],
    color: '#92400e',
    bg: '#fffbeb',
    border: '#fbbf24',
    icon: '⚠️',
    title: 'Your concern has been noted',
    message: 'We understand this is stressful. Your complaint will be prioritized and reviewed promptly by the appropriate authority.',
    priorityBoost: 3,
  },
]

/**
 * Scans complaint text and returns the highest distress signal found.
 * @param {string} text - The complaint text being typed
 * @returns {{ level, color, bg, border, icon, title, message, priorityBoost } | null}
 */
export function detectEmotion(text) {
  if (!text || text.trim().length < 5) return null
  const lower = text.toLowerCase()

  for (const d of DISTRESS_LEVELS) {
    if (d.keywords.some(k => lower.includes(k))) {
      return d
    }
  }
  return null
}
