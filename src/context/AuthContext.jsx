import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { auth as authApi } from '../api'
import { setUnauthorizedHandler, tokenStore, userStore } from '../api/client'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  // Synchronously restore user from localStorage to eliminate flicker / unwanted logouts
  const [user, setUser] = useState(() => userStore.get())
  const [loading, setLoading] = useState(() => !userStore.get() && !!tokenStore.get())

  const clear = useCallback(() => {
    tokenStore.clear()
    userStore.clear()
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(clear)
  }, [clear])

  useEffect(() => {
    const token = tokenStore.get()
    if (!token) {
      setLoading(false)
      return
    }

    let alive = true
    authApi
      .me()
      .then((r) => {
        if (!alive) return
        if (r?.user) {
          userStore.set(r.user)
          setUser(r.user)
        }
      })
      .catch((err) => {
        if (!alive) return
        // ONLY clear session if server explicitly returns 401 Unauthorized
        // Never log out the user on temporary server restart, network timeout, or 500 error!
        if (err?.status === 401) {
          clear()
        }
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [clear])

  const login = async (email, password) => {
    const r = await authApi.login({ email, password })
    if (r?.token) tokenStore.set(r.token)
    if (r?.user) {
      userStore.set(r.user)
      setUser(r.user)
    }
    return r.user
  }

  const register = async (email, display_name, password) => {
    const r = await authApi.register({ email, display_name, password })
    if (r?.token) tokenStore.set(r.token)
    if (r?.user) {
      userStore.set(r.user)
      setUser(r.user)
    }
    return r.user
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      /* token may already be revoked */
    }
    clear()
  }

  const refreshUser = async () => {
    const r = await authApi.me()
    if (r?.user) {
      userStore.set(r.user)
      setUser(r.user)
    }
    return r.user
  }

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </Ctx.Provider>
  )
}
