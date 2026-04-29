interface PauseButtonProps {
    isPaused: boolean
    onToggle: () => void
}

const PauseButton = ({ isPaused, onToggle }: PauseButtonProps) => (
    <button
        onClick={onToggle}
        className='p-1.5 rounded-full hover:bg-brand-hover transition-colors'
        aria-label={isPaused ? 'Resume game' : 'Pause game'}
        title={isPaused ? 'Resume (P)' : 'Pause (P)'}
    >
        {isPaused ? (
            // Play icon
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className='w-5 h-5'>
                <path d='M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z' />
            </svg>
        ) : (
            // Pause icon
            <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' className='w-5 h-5'>
                <path d='M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75A.75.75 0 0 0 7.25 3h-1.5ZM12.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z' />
            </svg>
        )}
    </button>
)

export default PauseButton
