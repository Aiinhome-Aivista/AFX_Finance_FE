import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { auth as authApi } from '../api'
import { setUnauthorizedHandler, tokenStore } from '../api/client'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!tokenStore.get())

  const clear = useCallback(() => { tokenStore.clear(); setUser(null) }, [])
  useEffect(() => { setUnauthorizedHandler(clear) }, [clear])

  useEffect(() => {
    if (!tokenStore.get()) return
    authApi.me().then((r) => setUser(r.user)).catch(clear).finally(() => setLoading(false))
  }, [clear])

  const login = async (email, password) => { const r = await authApi.login({ email, password }); tokenStore.set(r.token); setUser(r.user); return r.user }
  const register = async (email, display_name, password) => { const r = await authApi.register({ email, display_name, password }); tokenStore.set(r.token); setUser(r.user); return r.user }
  const logout = async () => { try { await authApi.logout() } catch { /* token may already be invalid */ } clear() }
  const refreshUser = async () => { const r = await authApi.me(); setUser(r.user); return r.user }

  return <Ctx.Provider value={{ user, loading, login, register, logout, refreshUser }}>{children}</Ctx.Provider>
}
