import { useRouter } from "next/router"
import Link from "next/link"
import { FormEvent, useCallback, useEffect, useRef } from "react"

const NAME_RE = /[^a-zA-Z0-9_-]/g

interface FormData {
    room_name: { value: string },
    player_name: { value: string }
}

const Welcome = () => {
    const router = useRouter()
    const error = router.query.error as string | undefined
    const roomInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        roomInputRef.current?.focus()
    }, [])

    // Strip characters that aren't allowed by the server NAME_PATTERN
    const sanitize = useCallback((e: React.FormEvent<HTMLInputElement>) => {
        const input = e.currentTarget
        const cleaned = input.value.replace(NAME_RE, '')
        if (cleaned !== input.value) input.value = cleaned
    }, [])

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const target = event.target as EventTarget & FormData
        const room = target.room_name.value.replace(NAME_RE, '')
        const player = target.player_name.value.replace(NAME_RE, '')
        if (!room || !player) return

        router.push(`/#${encodeURIComponent(room)}/${encodeURIComponent(player)}`)
    }

    return (
        <main className='flex-1 min-h-0 flex flex-col justify-center items-center py-4 sm:py-16 px-4 overflow-y-auto overflow-x-hidden'>
        <h1 className='text-center m-0 leading-[1.15] text-3xl sm:text-5xl lg:text-[4rem]'>
            Welcome to Red Tetris!
        </h1>
        <p className='mt-4 text-content-secondary text-center text-sm sm:text-base max-w-md'>
            The classic block-stacking game — reimagined for multiplayer.
        </p>
        <div className='flex flex-wrap justify-center gap-4 mt-6 sm:mt-8 max-w-lg'>
            <span className='flex items-center gap-1.5 text-xs sm:text-sm font-medium bg-surface-card px-3 py-1.5 rounded-full shadow-xs border border-edge'>
                👥 Up to 4 players
            </span>
            <span className='flex items-center gap-1.5 text-xs sm:text-sm font-medium bg-surface-card px-3 py-1.5 rounded-full shadow-xs border border-edge'>
                ⚡ Real-time multiplayer
            </span>
            <span className='flex items-center gap-1.5 text-xs sm:text-sm font-medium bg-surface-card px-3 py-1.5 rounded-full shadow-xs border border-edge'>
                📱 Mobile friendly
            </span>
            <span className='flex items-center gap-1.5 text-xs sm:text-sm font-medium bg-surface-card px-3 py-1.5 rounded-full shadow-xs border border-edge'>
                🌙 Dark &amp; light modes
            </span>
        </div>
        <form className='flex flex-col w-full max-w-sm sm:max-w-md m-4 sm:m-16 px-4 sm:px-6 pt-8 sm:pt-16 pb-6 sm:pb-8 bg-surface-card outline-solid shadow-md shadow-brand drop-shadow-lg outline-brand rounded-sm' onSubmit={onSubmit}>
            {error === 'roomIsFull' && (
                <div className='mb-4 p-3 rounded-sm bg-status-danger/10 border border-status-danger text-status-danger text-sm text-center' role='alert'>
                    That room is full (max 4 players). Try a different room name.
                </div>
            )}
            <div className='flex flex-col sm:flex-row my-3 gap-2'>
                <label className='sm:w-1/3 self-start sm:self-center sm:text-center' htmlFor='room_name'>Room name</label>
                <input className='sm:w-2/3 h-10 px-3 bg-surface-input outline-1 outline-solid outline-edge rounded-sm focus:outline-hidden focus:ring-2 focus:ring-brand' type='text' id='room_name' name='room_name' required maxLength={32} pattern='[a-zA-Z0-9_-]+' title='Letters, numbers, hyphens and underscores only' onInput={sanitize} ref={roomInputRef}></input>
            </div>
            <div className='flex flex-col sm:flex-row my-3 gap-2'>
                <label className='sm:w-1/3 self-start sm:self-center sm:text-center' htmlFor='player_name'>Player name</label>
                <input className='sm:w-2/3 h-10 px-3 bg-surface-input outline-1 outline-solid outline-edge rounded-sm focus:outline-hidden focus:ring-2 focus:ring-brand' type='text' id='player_name' name='player_name' required maxLength={32} pattern='[a-zA-Z0-9_-]+' title='Letters, numbers, hyphens and underscores only' onInput={sanitize}></input>
            </div>
            <button className='mt-8 sm:mt-16 p-3 w-full bg-brand rounded-sm uppercase font-semibold hover:bg-brand-hover hover:text-content-inverse transition-colors focus:outline-hidden focus:ring-2 focus:ring-brand focus:ring-offset-2' type='submit'>Start/Join room</button>
            <Link href='/leaderboard' className='mt-4 text-center text-sm text-content-secondary hover:text-brand transition-colors'>
                🏆 View Leaderboard
            </Link>
        </form>
    </main>
    )
}

export default Welcome