import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { soundManager } from '../utils/sound-manager'
import type { SoundName } from '../utils/sound-manager'

type SoundContextValue = {
    muted: boolean
    toggleMute: () => void
    play: (name: SoundName) => void
}

const SoundContext = createContext<SoundContextValue | null>(null)

export function SoundProvider({ children }: { children: React.ReactNode }) {
    const [muted, setMuted] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem('soundMuted')
        if (stored === 'true') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setMuted(true)
            soundManager.muted = true
        }
    }, [])

    // Unlock AudioContext on first user interaction
    useEffect(() => {
        const unlock = () => {
            soundManager.unlock()
            window.removeEventListener('click', unlock)
            window.removeEventListener('keydown', unlock)
        }
        window.addEventListener('click', unlock, { once: true })
        window.addEventListener('keydown', unlock, { once: true })
        return () => {
            window.removeEventListener('click', unlock)
            window.removeEventListener('keydown', unlock)
        }
    }, [])

    const toggleMute = useCallback(() => {
        setMuted(prev => {
            const next = !prev
            soundManager.muted = next
            localStorage.setItem('soundMuted', String(next))
            return next
        })
    }, [])

    const play = useCallback((name: SoundName) => {
        soundManager.play(name)
    }, [])

    return (
        <SoundContext.Provider value={{ muted, toggleMute, play }}>
            {children}
        </SoundContext.Provider>
    )
}

export function useSound() {
    const context = useContext(SoundContext)
    if (!context) {
        throw new Error('useSound must be used within a SoundProvider')
    }
    return context
}
