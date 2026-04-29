import React, { useCallback, useEffect, useRef, useState } from 'react'
import { COLS, ROWS } from '../shared/config'
import { PlayState, Stack } from '../shared/types'
import MiniBoard, { MINI_SPACING } from './mini-board'

export type SpectatorBoard = {
    playerId: string
    playerName: string
    playState: PlayState
    stack: Stack[]
}

type SpectatorPanelProps = {
    boards: SpectatorBoard[]
}

const GAP = 16 // gap between boards (px)
const NAME_H = 20 // approximate name label height (px)

function computeTileSize(containerW: number, containerH: number, n: number): number {
    if (n === 0) return 12
    const boardW = (containerW - (n - 1) * GAP) / n
    const tileW = Math.floor((boardW - (COLS - 1) * MINI_SPACING) / COLS)
    const tileH = Math.floor((containerH - NAME_H - (ROWS - 1) * MINI_SPACING) / ROWS)
    return Math.max(1, Math.min(tileW, tileH))
}

export default function SpectatorPanel({ boards }: SpectatorPanelProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [tileSize, setTileSize] = useState(12)

    const recompute = useCallback(() => {
        const el = containerRef.current
        if (!el) return
        const { width, height } = el.getBoundingClientRect()
        if (width > 0 && height > 0) {
            setTileSize(computeTileSize(width, height, boards.length))
        }
    }, [boards.length])

    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const obs = new ResizeObserver(recompute)
        obs.observe(el)
        recompute()
        return () => obs.disconnect()
    }, [recompute])

    // Recompute tileSize when board count changes
    useEffect(() => { recompute() }, [boards.length, recompute])

    if (boards.length === 0) {
        return (
            <div className='h-full flex items-center justify-center text-content-secondary text-sm'>
                Waiting for game…
            </div>
        )
    }

    return (
        <div ref={containerRef} className='h-full flex flex-row items-start' style={{ gap: GAP }}>
            {boards.map((b) => (
                <div key={b.playerId} className='flex-1 min-w-0 h-full'>
                    <MiniBoard
                        playerName={b.playerName}
                        playState={b.playState}
                        stack={b.stack}
                        tileSize={tileSize}
                    />
                </div>
            ))}
        </div>
    )
}
