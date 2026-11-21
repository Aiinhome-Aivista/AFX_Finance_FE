import axios from 'axios'

const TOKEN_KEY = 'fkg-token'
const USER_KEY = 'fkg-user'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export const userStore = {
  get: () => {
    try {
      const v = localStorage.getItem(USER_KEY)
      return v ? JSON.parse(v) : null
    } catch {
      return null
    }
  },
  set: (u) => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(u))
    } catch {}
  },
  clear: () => localStorage.removeItem(USER_KEY),
}

const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
const http = axios.create({ baseURL: (apiBase ? apiBase : '') + '/api', timeout: 60000 })

http.interceptors.request.use((cfg) => {
  const t = tokenStore.get()
  if (t) cfg.headers.Authorization = `Bearer ${t}`

  try {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location?.search || '')
      const isFresh = sp.get('fresh') === '1' || sessionStorage.getItem('afx_fresh_session') === 'true'
      let wf = sp.get('wf')
      let model = sp.get('model')

      // Fallback: check active workspace in sessionStorage for this domain if not in current URL and NOT a fresh session
      if (isFresh) {
        wf = null
        model = null
      } else if (!wf && window.location?.pathname) {
        const parts = window.location.pathname.split('/').filter(Boolean)
        if (parts[0] === 'finance' && parts[1]) {
          const domSlug = parts[1]
          wf = sessionStorage.getItem(`afx_active_wf_${domSlug}`)
          if (!model) {
            model = sessionStorage.getItem(`afx_active_model_${domSlug}`)
          }
        }
      }

      if (wf && !cfg.headers['X-Workflow-Id']) {
        cfg.headers['X-Workflow-Id'] = wf
      }
      if (model && !cfg.headers['X-Model-Name']) {
        cfg.headers['X-Model-Name'] = model
      }
    }
  } catch {}

  return cfg
})

let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

http.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err.response?.status
    const e = err.response?.data?.error
    const out = new Error(e?.message || (err.code === 'ECONNABORTED' ? 'The request timed out.' : err.message === 'Network Error' ? 'Cannot reach the server. Is the backend running?' : 'Something went wrong.'))
    out.status = status
    out.code = e?.code
    out.details = e?.details
    if (status === 401 && tokenStore.get() && !err.config?.url?.includes('/auth/login')) onUnauthorized()
    return Promise.reject(out)
  },
)

export default http
