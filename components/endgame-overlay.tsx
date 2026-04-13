import { useContext, useMemo } from 'react'
import { SocketContext } from '../context/socket'

// Tetromino shapes for the celebration particles (col, row pairs)
const SHAPES: [number, number][][] = [
    [[0,0],[1,0],[2,0],[3,0]],     // I
    [[0,0],[1,0],[0,1],[1,1]],     // O
    [[0,0],[1,0],[2,0],[1,1]],     // T
    [[0,0],[0,1],[1,1],[2,1]],     // J
    [[2,0],[0,1],[1,1],[2,1]],     // L
    [[0,0],[1,0],[1,1],[2,1]],     // Z
    [[1,0],[2,0],[0,1],[1,1]],     // S
]

const COLORS = [
    '#22d3ee', '#facc15', '#c084fc', '#60a5fa',
    '#fb923c', '#fb7185', '#4ade80',
]

function rotateShape(cells: [number, number][], times: number): [number, number][] {
    let rotated = cells
    for (let i = 0; i < times; i++) {
        const maxRow = Math.max(...rotated.map(c => c[1]))
        rotated = rotated.map(([col, row]) => [maxRow - row, col])
    }
    return rotated
}

type FallingPiece = {
    cells: [number, number][]
    color: string
    left: number   // % from left
    delay: number  // animation-delay in s
    size: number   // cell size in px
    rotation: number // deg tilt
}

function generateFallingPieces(count: number): FallingPiece[] {
    const pieces: FallingPiece[] = []
    for (let i = 0; i < count; i++) {
        const shapeIdx = Math.floor(Math.random() * SHAPES.length)
        const gridRotation = Math.floor(Math.random() * 4)
        pieces.push({
            cells: rotateShape(SHAPES[shapeIdx], gridRotation),
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            left: Math.random() * 90 + 5,
            delay: (i / count) * 4 + Math.random() * 0.5, // stagger evenly across one cycle
            size: 6 + Math.random() * 6,
            rotation: Math.random() * 60 - 30,
        })
    }
    return pieces
}

type Props = {
    won: boolean
    score: number
    level: number
    totalLines: number
}

const EndgameOverlay = ({ won, score, level, totalLines }: Props) => {
    const socket = useContext(SocketContext)
    const fallingPieces = useMemo(() => won ? generateFallingPieces(16) : [], [won])

    const handleQuit = () => {
        socket.emit('quitGame')
    }

    return (
        <>
            {/* Full-viewport rain layer — clipped between header and footer */}
            {won && (
                <div
                    className='fixed left-0 right-0 pointer-events-none overflow-hidden z-30'
                    style={{ top: '2.5rem', bottom: '2.5rem' }}
                    aria-hidden='true'
                >
                    {fallingPieces.map((piece, i) => (
                        <svg
                            key={i}
                            className='absolute pointer-events-none animate-[tetrisFall_4s_linear_infinite]'
                            style={{
                                left: `${piece.left}%`,
                                top: '-5%',
                                animationDelay: `${piece.delay}s`,
                                transform: `rotate(${piece.rotation}deg)`,
                            }}
                            width={piece.size * 4 + 4}
                            height={piece.size * 4 + 4}
                        >
                            {piece.cells.map(([col, row], j) => (
                                <rect
                                    key={j}
                                    x={col * piece.size + 1}
                                    y={row * piece.size + 1}
                                    width={piece.size - 2}
                                    height={piece.size - 2}
                                    rx={piece.size * 0.25}
                                    fill={piece.color}
                                    opacity={0.85}
                                />
                            ))}
                        </svg>
                    ))}
                </div>
            )}

            {/* Card overlay on the canvas */}
            <div className='absolute inset-0 z-20 flex flex-col items-center justify-center animate-[fadeIn_0.4s_ease-out]'>
                {/* Backdrop tint */}
                <div className={`absolute inset-0 ${won ? 'bg-black/30' : 'bg-black/50'}`} />

                {/* Content panel */}
                <div className='relative z-10 flex flex-col items-center gap-4 px-6 py-8 rounded-lg bg-surface-card/95 border border-edge shadow-xl backdrop-blur-sm max-w-[280px] w-full animate-[scaleIn_0.3s_ease-out]'>
                    <div className='text-4xl'>
                        {won ? '🏆' : '💀'}
                    </div>
                    <h2 className='text-2xl font-bold tracking-tight text-center'>
                        {won ? 'Victory!' : 'Better luck next time!'}
                    </h2>

                    {/* Stats */}
                    <div className='grid grid-cols-3 gap-4 w-full text-center'>
                        <div className='flex flex-col'>
                            <span className='text-xs font-semibold uppercase tracking-wide text-content-secondary'>Score</span>
                            <span className='text-xl font-bold tabular-nums'>{score}</span>
                        </div>
                        <div className='flex flex-col'>
                            <span className='text-xs font-semibold uppercase tracking-wide text-content-secondary'>Lines</span>
                            <span className='text-xl font-bold tabular-nums'>{totalLines}</span>
                        </div>
                        <div className='flex flex-col'>
                            <span className='text-xs font-semibold uppercase tracking-wide text-content-secondary'>Level</span>
                            <span className='text-xl font-bold'>{level}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleQuit}
                        className='w-full py-2.5 mt-2 text-sm font-semibold uppercase rounded-sm bg-brand hover:bg-brand-hover text-content-inverse hover:text-content-inverse transition-colors focus:outline-hidden focus:ring-2 focus:ring-brand focus:ring-offset-2'
                    >
                        Back to Lobby
                    </button>
                </div>
            </div>
        </>
    )
}

export default EndgameOverlay
