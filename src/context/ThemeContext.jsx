import { createContext, useContext, useEffect, useState } from 'react'

const Ctx = createContext({ theme: 'light', toggle: () => {} })
export const useTheme = () => useContext(Ctx)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('fkg-user-chose-dark') === 'true' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem('fkg-theme', theme)
      if (theme === 'dark') {
        localStorage.setItem('fkg-user-chose-dark', 'true')
      } else {
        localStorage.removeItem('fkg-user-chose-dark')
      }
    } catch { /* private mode */ }
  }, [theme])

  return (
    <Ctx.Provider value={{ theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }}>
      {children}
    </Ctx.Provider>
  )
}
