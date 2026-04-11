import { useRouter } from "next/router"
import { FormEvent } from "react"

interface FormData {
    room_name: { value: string },
    player_name: { value: string }
}

const Welcome = () => {
    const router = useRouter()

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const target = event.target as EventTarget & FormData

        router.push(`/#${encodeURIComponent(target.room_name.value)}/${encodeURIComponent(target.player_name.value)}`)
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
            <span className='flex items-center gap-1.5 text-xs sm:text-sm font-medium bg-surface-card px-3 py-1.5 rounded-full shadow-sm border border-edge'>
                👥 Up to 4 players
            </span>
            <span className='flex items-center gap-1.5 text-xs sm:text-sm font-medium bg-surface-card px-3 py-1.5 rounded-full shadow-sm border border-edge'>
                ⚡ Real-time multiplayer
            </span>
            <span className='flex items-center gap-1.5 text-xs sm:text-sm font-medium bg-surface-card px-3 py-1.5 rounded-full shadow-sm border border-edge'>
                🎮 NES-style difficulty
            </span>
            <span className='flex items-center gap-1.5 text-xs sm:text-sm font-medium bg-surface-card px-3 py-1.5 rounded-full shadow-sm border border-edge'>
                🌙 Dark &amp; light modes
            </span>
        </div>
        <form className='flex flex-col w-full max-w-sm sm:max-w-md m-4 sm:m-16 px-4 sm:px-6 pt-8 sm:pt-16 pb-6 sm:pb-8 bg-surface-card outline shadow-md shadow-brand drop-shadow-lg outline-brand rounded' onSubmit={onSubmit} action=''>
            <div className='flex flex-col sm:flex-row my-3 gap-2'>
                <label className='sm:w-1/3 self-start sm:self-center sm:text-center' htmlFor='room_name'>Room name</label>
                <input className='sm:w-2/3 h-10 px-3 bg-surface-input outline-1 outline outline-edge rounded focus:outline-none focus:ring-2 focus:ring-brand' type='text' id='room_name' name='room_name' required></input>
            </div>
            <div className='flex flex-col sm:flex-row my-3 gap-2'>
                <label className='sm:w-1/3 self-start sm:self-center sm:text-center' htmlFor='player_name'>Player name</label>
                <input className='sm:w-2/3 h-10 px-3 bg-surface-input outline-1 outline outline-edge rounded focus:outline-none focus:ring-2 focus:ring-brand' type='text' id='player_name' name='player_name' required></input>
            </div>
            <button className='mt-8 sm:mt-16 p-3 w-full bg-brand rounded uppercase font-semibold hover:bg-brand-hover hover:text-content-inverse transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2' type='submit'>Start/Join room</button>
        </form>
    </main>
    )
}

export default Welcome