import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
type ThemeContextValue = { theme: Theme; toggleTheme: () => void }

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark', toggleTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('dark')

    useEffect(() => {
        // Sync React state with the class set by the inline FOUC-prevention script.
        const isDark = document.documentElement.classList.contains('dark')
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTheme(isDark ? 'dark' : 'light')
    }, [])

    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            const next = prev === 'dark' ? 'light' : 'dark'
            document.documentElement.classList.toggle('dark', next === 'dark')
            localStorage.setItem('theme', next)
            return next
        })
    }, [])

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => useContext(ThemeContext)
