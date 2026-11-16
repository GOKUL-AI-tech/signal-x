import { useState, useEffect, useRef } from 'react'
import { analyzeComplaintsBatch } from '../lib/aiAnalyzer'

/**
 * useAIPriority
 * Analyzes complaints via Groq AI (or keyword fallback).
 * Returns: { priorities: { ticket_id → priority }, loading, refresh }
 */
export function useAIPriority(complaints) {
  const [priorities, setPriorities] = useState({})
  const [loading, setLoading] = useState(false)
  const prevIds = useRef('')

  useEffect(() => {
    if (!complaints || complaints.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPriorities({})
      return
    }

    // Only re-analyze if the set of ticket IDs changed
    const ids = complaints.map(c => c.ticket_id).sort().join(',')
    if (ids === prevIds.current) return
    prevIds.current = ids

    setLoading(true)
    analyzeComplaintsBatch(complaints)
      .then(setPriorities)
      .finally(() => setLoading(false))
  }, [complaints])

  // Manual refresh (call after submitting a new complaint)
  const refresh = () => {
    prevIds.current = ''
    if (complaints?.length) {
      setLoading(true)
      analyzeComplaintsBatch(complaints)
        .then(setPriorities)
        .finally(() => setLoading(false))
    }
  }

  return { priorities, loading, refresh }
}
