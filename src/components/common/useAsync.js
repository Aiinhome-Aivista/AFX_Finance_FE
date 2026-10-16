import { useCallback, useEffect, useRef, useState } from 'react'

/** Run an async loader; tracks loading/error and ignores stale responses. */
export default function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: immediate })
  const seq = useRef(0)
  const run = useCallback((...args) => {
    const id = ++seq.current
    setState((s) => ({ ...s, loading: true, error: null }))
    return fn(...args).then(
      (data) => { if (id === seq.current) setState({ data, error: null, loading: false }); return data },
      (error) => { if (id === seq.current) setState((s) => ({ ...s, error, loading: false })); throw error },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => { if (immediate) run().catch(() => {}) }, [run, immediate])
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) }
}
