import { useCallback, useContext, useEffect, useRef } from 'react'
import { SocketContext } from '../context/socket'

const REPEAT_DELAY = 200 // ms before auto-repeat starts
const REPEAT_INTERVAL = 80 // ms between repeats

type DPadProps = { disabled?: boolean }

const DPad = ({ disabled }: DPadProps) => {
    const socket = useContext(SocketContext)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const stopRepeat = useCallback(() => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    }, [])

    // Clean up timers on unmount (e.g. game over while touch is active)
    useEffect(() => stopRepeat, [stopRepeat])

    const startRepeat = useCallback((action: () => void) => {
        stopRepeat()
        action()
        timerRef.current = setTimeout(() => {
            intervalRef.current = setInterval(action, REPEAT_INTERVAL)
        }, REPEAT_DELAY)
    }, [stopRepeat])

    const btn = 'flex items-center justify-center w-12 h-10 sm:w-16 sm:h-12 rounded-lg bg-surface-card border border-edge text-xl font-bold active:bg-brand active:text-content-inverse select-none transition-colors touch-manipulation'

    return (
        <div className='flex lg:hidden items-center justify-center gap-2 sm:gap-6 py-2' role='group' aria-label='Game controls'>
            <button
                className={btn}
                aria-label='Move left'
                disabled={disabled}
                onTouchStart={(e) => { e.preventDefault(); startRepeat(() => socket.emit('moveLeft')) }}
                onTouchEnd={stopRepeat}
                onTouchCancel={stopRepeat}
            >←</button>
            <button
                className={btn}
                aria-label='Move right'
                disabled={disabled}
                onTouchStart={(e) => { e.preventDefault(); startRepeat(() => socket.emit('moveRight')) }}
                onTouchEnd={stopRepeat}
                onTouchCancel={stopRepeat}
            >→</button>
            <button
                className={btn}
                aria-label='Move down'
                disabled={disabled}
                onTouchStart={(e) => { e.preventDefault(); startRepeat(() => socket.emit('moveDown')) }}
                onTouchEnd={stopRepeat}
                onTouchCancel={stopRepeat}
            >↓</button>
            <button
                className={btn}
                aria-label='Rotate'
                disabled={disabled}
                onTouchStart={(e) => { e.preventDefault(); socket.emit('rotate') }}
            >↻</button>
        </div>
    )
}

export default DPad
