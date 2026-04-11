import { useSound } from '../context/sound'

const SoundToggle = () => {
    const { muted, toggleMute } = useSound()

    return (
        <button
            onClick={toggleMute}
            className='p-1.5 rounded-full hover:bg-brand-hover transition-colors'
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
        >
            {muted ? (
                // Muted icon
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className='w-5 h-5'>
                    <path d='M9.547 3.062A.75.75 0 0 1 10 3.75v12.5a.75.75 0 0 1-1.264.546L5.203 13.5H2.75A.75.75 0 0 1 2 12.75v-5.5a.75.75 0 0 1 .75-.75h2.453l3.533-3.296a.75.75 0 0 1 .811-.142ZM13.28 7.22a.75.75 0 1 0-1.06 1.06L13.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L15 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L16.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L15 8.94l-1.72-1.72Z' />
                </svg>
            ) : (
                // Volume icon
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className='w-5 h-5'>
                    <path d='M10 3.75a.75.75 0 0 0-1.264-.546L5.203 6.5H2.75a.75.75 0 0 0-.75.75v5.5c0 .414.336.75.75.75h2.453l3.533 3.296A.75.75 0 0 0 10 16.25V3.75ZM15.95 5.05a.75.75 0 0 0-1.06 1.06 5.5 5.5 0 0 1 0 7.78.75.75 0 0 0 1.06 1.06 7 7 0 0 0 0-9.9Z' />
                    <path d='M13.829 7.172a.75.75 0 0 0-1.06 1.06 2.5 2.5 0 0 1 0 3.536.75.75 0 0 0 1.06 1.06 4 4 0 0 0 0-5.656Z' />
                </svg>
            )}
        </button>
    )
}

export default SoundToggle
