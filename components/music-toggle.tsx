import { useSound } from '../context/sound'

const MusicToggle = () => {
    const { musicEnabled, toggleMusic } = useSound()

    return (
        <button
            onClick={toggleMusic}
            className='p-1.5 rounded-full hover:bg-brand-hover transition-colors'
            aria-label={musicEnabled ? 'Disable music' : 'Enable music'}
        >
            {musicEnabled ? (
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className='w-5 h-5'>
                    <path fillRule='evenodd' d='M17.721 1.599a.75.75 0 0 1 .279.584v12.067a.75.75 0 0 1-.279.584 2.25 2.25 0 1 1-.721-1.742V5.994l-10 2.222v8.034a.75.75 0 0 1-.279.584 2.25 2.25 0 1 1-.721-1.742V4.25a.75.75 0 0 1 .592-.729l11-2.444a.75.75 0 0 1 .908.522l.22.75Z' clipRule='evenodd' />
                </svg>
            ) : (
                <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className='w-5 h-5 opacity-50'>
                    <path fillRule='evenodd' d='M17.721 1.599a.75.75 0 0 1 .279.584v12.067a.75.75 0 0 1-.279.584 2.25 2.25 0 1 1-.721-1.742V5.994l-10 2.222v8.034a.75.75 0 0 1-.279.584 2.25 2.25 0 1 1-.721-1.742V4.25a.75.75 0 0 1 .592-.729l11-2.444a.75.75 0 0 1 .908.522l.22.75Z' clipRule='evenodd' />
                    <path d='M2.5 2.5l15 15' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
                </svg>
            )}
        </button>
    )
}

export default MusicToggle
