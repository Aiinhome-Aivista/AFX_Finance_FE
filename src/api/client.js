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

const http = axios.create({ baseURL: (import.meta.env.VITE_API_BASE_URL || '') + '/api', timeout: 60000 })

http.interceptors.request.use((cfg) => {
  const t = tokenStore.get()
  if (t) cfg.headers.Authorization = `Bearer ${t}`
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
