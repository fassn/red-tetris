import { memo, useEffect, useRef } from 'react'
import { COLS, ROWS } from '../shared/config'
import { useTheme } from '../context/theme'
import { syncCanvasTheme, getTileBg, setupHiDPI } from '../utils/draw'
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
    const { theme } = useTheme()

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = setupHiDPI(canvas, MINI_WIDTH, MINI_HEIGHT)
        if (!ctx) {
            console.warn('MiniBoard: failed to get 2d canvas context')
            return
        }

        syncCanvasTheme()
        const tileBg = getTileBg()
        const hasRoundRect = typeof ctx.roundRect === 'function'
        let x = 0
        let y = 0

        for (let col = 0; col < COLS; col++) {
            for (let row = 0; row < ROWS; row++) {
                const t = stack[row * COLS + col]
                ctx.fillStyle = t.isFilled ? rgba(t.color) : tileBg
                if (hasRoundRect) {
                    ctx.beginPath()
                    ctx.roundRect(x, y, MINI_TILE, MINI_TILE, MINI_RADIUS)
                    ctx.fill()
                } else {
                    ctx.fillRect(x, y, MINI_TILE, MINI_TILE)
                }
                y += MINI_TILE + MINI_SPACING
            }
            y = 0
            x += MINI_TILE + MINI_SPACING
        }
    }, [stack, theme])

    const stateLabel = playState === PlayState.PLAYING
        ? '🟢 Playing'
        : playState === PlayState.ENDGAME
            ? '🔴 Out'
            : '⏳ Waiting'

    return (
        <div className='flex flex-col items-center gap-1.5'>
            <span className='hidden sm:block text-sm font-semibold truncate max-w-full'>{playerName}</span>
            <canvas
                ref={canvasRef}
                width={MINI_WIDTH}
                height={MINI_HEIGHT}
                className='rounded-sm border border-edge'
                role='img'
                aria-label={`${playerName}'s board — ${stateLabel}`}
            />
            <span className='hidden sm:block text-xs text-content-secondary'>{stateLabel}</span>
        </div>
    )
}

export default memo(MiniBoard)
