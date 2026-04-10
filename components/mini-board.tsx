import { useEffect, useRef } from 'react'
import { BACKGROUND_COLOR, COLS, ROWS, SPACING } from '../shared/config'
import { PlayState, RGBA, Stack } from '../shared/types'

const MINI_TILE = 8
const MINI_SPACING = 1
const MINI_RADIUS = 2
const MINI_WIDTH = COLS * MINI_TILE + (COLS - 1) * MINI_SPACING
const MINI_HEIGHT = ROWS * MINI_TILE + (ROWS - 1) * MINI_SPACING

function rgba(c: RGBA): string {
    return c.a !== undefined ? `rgba(${c.r},${c.g},${c.b},${c.a / 255})` : `rgb(${c.r},${c.g},${c.b})`
}

type MiniBoardProps = {
    playerName: string
    playState: PlayState
    stack: Stack[]
}

const MiniBoard = ({ playerName, playState, stack }: MiniBoardProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const bg = BACKGROUND_COLOR
        let x = 0
        let y = 0

        for (let col = 0; col < COLS; col++) {
            for (let row = 0; row < ROWS; row++) {
                const t = stack[row * COLS + col]
                ctx.fillStyle = t.isFilled ? rgba(t.color) : rgba(bg)
                ctx.beginPath()
                ctx.roundRect(x, y, MINI_TILE, MINI_TILE, MINI_RADIUS)
                ctx.fill()
                y += MINI_TILE + MINI_SPACING
            }
            y = 0
            x += MINI_TILE + MINI_SPACING
        }
    }, [stack])

    const stateLabel = playState === PlayState.PLAYING
        ? '🟢 Playing'
        : playState === PlayState.ENDGAME
            ? '🔴 Out'
            : '⏳ Waiting'

    return (
        <div className='flex flex-col items-center gap-1'>
            <span className='text-xs font-semibold truncate max-w-full'>{playerName}</span>
            <canvas
                ref={canvasRef}
                width={MINI_WIDTH}
                height={MINI_HEIGHT}
                className='rounded border border-neutral-300'
                role='img'
                aria-label={`${playerName}'s board — ${stateLabel}`}
            />
            <span className='text-[10px] text-neutral-500'>{stateLabel}</span>
        </div>
    )
}

export default MiniBoard
