/**
 * Nexus Duplicate Complaint Detector
 * Checks if new complaint text is suspiciously similar to a recent one.
 */

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2)
}

function jaccardSimilarity(a, b) {
  const setA = new Set(tokenize(a))
  const setB = new Set(tokenize(b))
  if (setA.size === 0 || setB.size === 0) return 0
  const intersection = new Set([...setA].filter(x => setB.has(x)))
  const union = new Set([...setA, ...setB])
  return intersection.size / union.size
}

/**
 * Check new text against existing complaints from same student.
 * @param {string} newText - text being typed
 * @param {Array}  existing - array of complaint objects with issue_text + status
 * @returns {{ isDuplicate: boolean, matchedTicket: string|null, similarity: number }}
 */
export function checkDuplicate(newText, existing) {
  if (!newText || newText.trim().length < 20 || !existing?.length) {
    return { isDuplicate: false, matchedTicket: null, similarity: 0 }
  }

  const unresolved = existing.filter(c => c.status !== 'Resolved')
  let best = { similarity: 0, ticket: null }

  for (const c of unresolved) {
    const sim = jaccardSimilarity(newText, c.issue_text)
    if (sim > best.similarity) {
      best = { similarity: sim, ticket: c.ticket_id }
    }
  }

  return {
    isDuplicate: best.similarity > 0.45,
    matchedTicket: best.ticket,
    similarity: Math.round(best.similarity * 100),
  }
}
