import { createContext, useContext, useEffect, useState } from 'react'

const Ctx = createContext({ theme: 'dark', toggle: () => { } })
export const useTheme = () => useContext(Ctx)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('fkg-user-chose-light') === 'true' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem('fkg-theme', theme)
        if (theme === 'light') {
          localStorage.setItem('fkg-user-chose-light', 'true')
        } else {
          localStorage.removeItem('fkg-user-chose-light')
        }
      } catch { /* private mode */ }
    }, [theme])

  return (
    <Ctx.Provider value={{ theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }}>
      {children}
    </Ctx.Provider>
  )
}
