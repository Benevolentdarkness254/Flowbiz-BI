// frontend/src/hooks/useApi.js
import { useState, useEffect, useCallback } from 'react'

/**
 * Generic hook for API calls with loading/error state.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi(
 *     () => salesApi.getTransactions({ page: 1 }),
 *     []  // dependencies — re-fetch when these change (like useEffect)
 *   )
 */
export function useApi(apiFn, deps = []) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetch = useCallback(() => {
    setLoading(true)
    setError(null)
    apiFn()
      .then(res  => setData(res.data))
      .catch(err => setError(err.response?.data?.error ?? 'Something went wrong'))
      .finally(()  => setLoading(false))
  }, deps)

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}