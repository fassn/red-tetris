import React from 'react'

type Props = {
    count: number | null
}

const GameCountdown = ({ count }: Props) => {
    if (count === null) return null

    const label = count === 0 ? 'GO!' : String(count)

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-none'>
            <span
                key={count}
                className='animate-countdown-pop text-white font-black select-none'
                style={{ fontSize: 'clamp(5rem, 20vw, 12rem)' }}
            >
                {label}
            </span>
        </div>
    )
}

export default GameCountdown
