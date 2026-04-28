import React, { memo, useCallback, useEffect, useRef } from 'react'
import { COLS, ROWS } from '../shared/config'
import { useTheme } from '../context/theme'
import { syncCanvasTheme, getTileBg, setupHiDPI, resolveColor } from '../utils/draw'
import { PlayState, RGBA, Stack } from '../shared/types'

export const MINI_TILE = 12
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
    /** Desktop: explicit tile size for dynamic canvas dimensions */
    tileSize?: number
    /** Fires with canvas-area dimensions when it resizes (for the first desktop cell) */
    onContainerResize?: (w: number, h: number) => void
    /** Mobile: hide the name/state label */
    hideLabel?: boolean
}

const MiniBoard = ({ playerName, playState, stack, tileSize, onContainerResize, hideLabel }: MiniBoardProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const canvasAreaRef = useRef<HTMLDivElement>(null)
    const { theme } = useTheme()

    const effectiveTile = tileSize ?? MINI_TILE
    const canvasW = COLS * effectiveTile + (COLS - 1) * MINI_SPACING
    const canvasH = ROWS * effectiveTile + (ROWS - 1) * MINI_SPACING

    // Observe canvas area for desktop tile computation
    const stableOnResize = useCallback((entries: ResizeObserverEntry[]) => {
        const { width, height } = entries[0].contentRect
        if (width > 0 && height > 0) onContainerResize?.(width, height)
    }, [onContainerResize])

    useEffect(() => {
        if (!onContainerResize) return
        const el = canvasAreaRef.current
        if (!el) return
        const obs = new ResizeObserver(stableOnResize)
        obs.observe(el)
        return () => obs.disconnect()
    }, [onContainerResize, stableOnResize])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = setupHiDPI(canvas, canvasW, canvasH)
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
                ctx.fillStyle = t.isFilled ? rgba(resolveColor(t.color)) : tileBg
                if (hasRoundRect) {
                    ctx.beginPath()
                    ctx.roundRect(x, y, effectiveTile, effectiveTile, MINI_RADIUS)
                    ctx.fill()
                } else {
                    ctx.fillRect(x, y, effectiveTile, effectiveTile)
                }
                y += effectiveTile + MINI_SPACING
            }
            y = 0
            x += effectiveTile + MINI_SPACING
        }
    }, [stack, theme, tileSize, effectiveTile, canvasW, canvasH])

    const stateEmoji = playState === PlayState.PLAYING ? '🟢' : playState === PlayState.ENDGAME ? '🔴' : '⏳'
    const stateLabel = playState === PlayState.PLAYING ? 'Playing' : playState === PlayState.ENDGAME ? 'Out' : 'Waiting'

    // Canvas sizing strategy (non-tileSize case uses height-based flex scaling):
    //   tileSize (desktop): explicit dimensions, HiDPI-correct inline style
    //   no tileSize: h-full w-auto + aspect-ratio scales canvas to container height
    const canvasClass = tileSize != null
        ? 'block rounded-sm border border-edge'
        : 'h-full w-auto rounded-sm border border-edge'
    const canvasStyle: React.CSSProperties = tileSize != null
        ? { width: canvasW, height: canvasH }
        : { aspectRatio: `${MINI_WIDTH} / ${MINI_HEIGHT}` }

    return (
        <div className='h-full flex flex-col gap-0.5'>
            {!hideLabel && (
                <div className='flex items-center gap-1 shrink-0 overflow-hidden px-0.5'>
                    <span className='text-xs font-semibold truncate flex-1 min-w-0'>{playerName}</span>
                    <span className='text-xs shrink-0'>{stateEmoji}</span>
                </div>
            )}
            <div
                ref={canvasAreaRef}
                className='flex-1 min-h-0 flex items-center justify-center min-w-0'
            >
                <canvas
                    ref={canvasRef}
                    width={canvasW}
                    height={canvasH}
                    className={canvasClass}
                    style={canvasStyle}
                    role='img'
                    aria-label={`${playerName}'s board — ${stateLabel}`}
                />
            </div>
        </div>
    )
}

export default memo(MiniBoard)
