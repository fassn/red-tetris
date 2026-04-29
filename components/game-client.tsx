import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { SocketContext } from '../context/socket'
import { useTheme } from '../context/theme'
import { useSound } from '../context/sound'
import { BOARDHEIGHT, BOARDWIDTH, COLS, ROWS, SOFT_DROP_MS, SPACING, TICK_RATE } from '../shared/config'
import {
    drawPiece, drawStack, getCascadeTiles, advanceCascadeAnimation,
    clearCanvas, drawPreviewPiece, syncCanvasTheme, setupHiDPI,
    drawEndgameBoard, setTileSize,
} from '../utils/draw'
import { createEmptyPiece, createEmptyStack } from '../shared/stack'
import useListeners from '../hooks/use-listeners'
import { PieceProps, PlayerState, PlayState, RoomPlayer, Stack, TileProps, GameMode } from '../shared/types'
import MiniBoard, { MINI_TILE } from './mini-board'
import DPad from './d-pad'
import EndgameOverlay from './endgame-overlay'
import type { OpponentBoards } from '../hooks/use-game-state'

const MINI_SPACING_VAL = 1

type GameClientProps = {
    playerState: PlayerState
    opponentBoards: OpponentBoards
    otherPlayers: RoomPlayer[]
    gameMode: GameMode
    timeRemaining: number
    bottomSlot?: React.ReactNode
    setCountdown: React.Dispatch<React.SetStateAction<number | null>>
    goTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
    isPaused: boolean
    canPause: boolean
    togglePause: () => void
}

const GameClient = ({ playerState, opponentBoards, otherPlayers, gameMode, timeRemaining, bottomSlot, setCountdown, goTimerRef, isPaused, canPause, togglePause }: GameClientProps) => {
    const socket = useContext(SocketContext)
    const { theme } = useTheme()
    const { play: playSound, musicEnabled, startMusic, stopMusic } = useSound()

    const canvasRef = useRef<HTMLCanvasElement>(null)
    // One preview canvas per breakpoint section (all 3 mounted simultaneously, CSS-hidden)
    const previewMobileRef = useRef<HTMLCanvasElement>(null)
    const previewTabletRef = useRef<HTMLCanvasElement>(null)
    const previewDesktopRef = useRef<HTMLCanvasElement>(null)
    const boardContainerRef = useRef<HTMLDivElement>(null)
    const keysDown = useRef(new Set<string>())

    const stack = useRef<Stack[]>(createEmptyStack())
    const currentPiece = useRef<PieceProps>(createEmptyPiece())
    const [nextPiece, setNextPiece] = useState<PieceProps>(createEmptyPiece())
    const getCascadeTilesCalled = useRef<boolean>(false)
    const cascadeTiles = useRef<TileProps[]>([])
    const [score, setScore] = useState(0)
    const [level, setLevel] = useState(0)
    const [totalLines, setTotalLines] = useState(0)
    const gameWon = useRef<boolean>(false)

    const [boardSize, setBoardSize] = useState({ width: BOARDWIDTH, height: BOARDHEIGHT })
    // null = not yet measured by ResizeObserver; MINI_TILE used as fallback
    const [desktopTileSize, setDesktopTileSize] = useState<number | null>(null)

    const activeOpponents = otherPlayers.filter(p =>
        p.state.playState === PlayState.PLAYING || p.state.playState === PlayState.ENDGAME
    )

    // Board ResizeObserver: on desktop (≥1024px) use height-only to avoid a circular
    // dependency when the column is lg:w-auto (container width == canvas width).
    // On mobile/tablet (w-full container) constrain by both axes so the board never overflows.
    useEffect(() => {
        const el = boardContainerRef.current
        if (!el) return
        const mq = window.matchMedia('(min-width: 1024px)')

        const computeTile = (width: number, height: number) => {
            if (width <= 0 || height <= 0) return
            const tileH = Math.floor((height - SPACING * (ROWS - 1)) / ROWS)
            const tileW = Math.floor((width  - SPACING * (COLS - 1)) / COLS)
            const tile  = Math.max(1, mq.matches ? tileH : Math.min(tileH, tileW))
            setBoardSize({
                width:  tile * COLS + SPACING * (COLS - 1),
                height: tile * ROWS + SPACING * (ROWS - 1),
            })
        }

        const obs = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect
            computeTile(width, height)
        })
        const mqListener = () => {
            const r = el.getBoundingClientRect()
            computeTile(r.width, r.height)
        }

        mq.addEventListener('change', mqListener)
        obs.observe(el)
        return () => { obs.disconnect(); mq.removeEventListener('change', mqListener) }
    }, [])

    // Desktop mini-boards: receive canvas-area dimensions from the first cell
    const handleContainerResize = useCallback((w: number, h: number) => {
        const tileByW = Math.floor((w - 2 - (COLS - 1) * MINI_SPACING_VAL) / COLS)
        const tileByH = Math.floor((h - 2 - (ROWS - 1) * MINI_SPACING_VAL) / ROWS)
        setDesktopTileSize(Math.max(4, Math.min(tileByW, tileByH)))
    }, [])

    useEffect(() => { syncCanvasTheme() }, [theme])

    useListeners({ stack, currentPiece, setNextPiece, setScore, setLevel, setTotalLines, gameWon, cascadeTiles, getCascadeTilesCalled, playSound, setCountdown, goTimerRef })

    useEffect(() => {
        if (playerState.playState === PlayState.PLAYING && musicEnabled) {
            startMusic()
        } else {
            stopMusic()
        }
        return () => { stopMusic() }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerState.playState, musicEnabled])

    // Draw next-piece preview to all 3 canvas positions
    useEffect(() => {
        for (const ref of [previewMobileRef, previewTabletRef, previewDesktopRef]) {
            const canvas = ref.current
            if (!canvas) continue
            const ctx = setupHiDPI(canvas, 90, 50)
            if (!ctx) continue
            drawPreviewPiece(ctx, nextPiece)
        }
    }, [nextPiece, theme, playerState.playState])

    // Game render loop
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        setTileSize(
            (boardSize.width  - SPACING * (COLS - 1)) / COLS,
            (boardSize.height - SPACING * (ROWS - 1)) / ROWS,
        )
        const ctx = setupHiDPI(canvas, boardSize.width, boardSize.height)
        if (!ctx) return

        let animId: number
        let lastFrame = 0
        let lastSoftDrop = 0
        let lastAnimStep = 0
        const interval = 1000 / TICK_RATE
        const ANIM_STEP_MS = 67

        const render = (ts: number) => {
            animId = requestAnimationFrame(render)
            if (ts - lastFrame < interval) return
            lastFrame = ts - ((ts - lastFrame) % interval)

            clearCanvas(ctx)
            drawStack(ctx, stack.current)

            if (playerState.playState === PlayState.PLAYING) {
                if (!isPaused && keysDown.current.has('ArrowDown') && ts - lastSoftDrop >= SOFT_DROP_MS) {
                    socket.emit('moveDown')
                    lastSoftDrop = ts
                }
                drawPiece(ctx, currentPiece.current)
            }

            if (playerState.playState === PlayState.ENDGAME) {
                const advance = ts - lastAnimStep >= ANIM_STEP_MS
                if (advance) lastAnimStep = ts
                if (!getCascadeTilesCalled.current) {
                    getCascadeTiles(cascadeTiles.current, stack.current)
                    getCascadeTilesCalled.current = true
                }
                if (advance) advanceCascadeAnimation(cascadeTiles.current)
                drawEndgameBoard(ctx, cascadeTiles.current)
            }
        }

        animId = requestAnimationFrame(render)
        return () => cancelAnimationFrame(animId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerState.playState, boardSize])

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement)?.tagName === 'INPUT') return
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault()
            if (e.key === 'p' && !e.repeat && canPause && playerState.playState === PlayState.PLAYING) {
                togglePause()
                return
            }
            if (isPaused) return
            if (e.key === 'ArrowUp' && !keysDown.current.has('ArrowUp')) socket.emit('rotate')
            keysDown.current.add(e.key)
            if (e.key === 'ArrowLeft')  socket.emit('moveLeft')
            if (e.key === 'ArrowRight') socket.emit('moveRight')
        }
        const onKeyUp = (e: KeyboardEvent) => { keysDown.current.delete(e.key) }
        window.addEventListener('keydown', onKeyDown)
        window.addEventListener('keyup', onKeyUp)
        return () => {
            window.removeEventListener('keydown', onKeyDown)
            window.removeEventListener('keyup', onKeyUp)
        }
    }, [socket, canPause, isPaused, togglePause, playerState.playState])

    const isPlaying   = playerState.playState === PlayState.PLAYING || playerState.playState === PlayState.ENDGAME
    const isEndgame   = playerState.playState === PlayState.ENDGAME
    const hasMiniboards = activeOpponents.length > 0
    const isTimeAttack  = gameMode === GameMode.TIME_ATTACK
    const effectiveMiniTile = desktopTileSize ?? MINI_TILE

    const formatTime = (s: number) => {
        const c = Math.max(0, s)
        return `${Math.floor(c / 60)}:${(c % 60).toString().padStart(2, '0')}`
    }

    // ─── Shared stat blocks ──────────────────────────────────────────────────────

    const mobileStats = (
        <div className='flex flex-row items-center gap-2 shrink-0'>
            <div className='flex flex-col items-center gap-0.5'>
                <span className='text-[9px] font-semibold uppercase tracking-wide text-content-secondary leading-none'>Next</span>
                <canvas ref={previewMobileRef} width={90} height={50}
                    className='rounded-sm' style={{ width: 60, height: 33 }} />
            </div>
            <div className='flex flex-col gap-0.5'>
                <div className='flex gap-2 justify-between items-center'>
                    <span className='text-[9px] font-semibold uppercase tracking-wide text-content-secondary'>Score </span>
                    <span className='text-xs font-bold tabular-nums'>{score}</span>
                </div>
                <div className='flex gap-2 justify-between items-center'>
                    <span className='text-[9px] font-semibold uppercase tracking-wide text-content-secondary'>Lv </span>
                    <span className='text-xs font-bold'>{level}</span>
                </div>
                {isTimeAttack && timeRemaining >= 0 && (
                    <div>
                        <span className='text-[9px] font-semibold uppercase tracking-wide text-content-secondary'>Time </span>
                        <span className={`text-xs font-bold tabular-nums ${timeRemaining <= 30 ? 'text-status-danger animate-pulse' : ''}`}>
                            {formatTime(timeRemaining)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )

    const tabletStats = (
        <div className='flex flex-row items-end gap-6'>
            <div className='flex flex-col items-center gap-1'>
                <span className='text-xs font-semibold uppercase tracking-wide text-content-secondary'>Next</span>
                <canvas ref={previewTabletRef} width={90} height={50}
                    className='rounded-sm' style={{ width: 90, height: 50 }} />
            </div>
            <div className='flex flex-col items-center'>
                <span className='text-xs font-semibold uppercase tracking-wide text-content-secondary'>Score</span>
                <span className='text-3xl font-bold tabular-nums'>{score}</span>
            </div>
            <div className='flex flex-col items-center'>
                <span className='text-xs font-semibold uppercase tracking-wide text-content-secondary'>Level</span>
                <span className='text-3xl font-bold'>{level}</span>
            </div>
            {isTimeAttack && timeRemaining >= 0 && (
                <div className='flex flex-col items-center'>
                    <span className='text-xs font-semibold uppercase tracking-wide text-content-secondary'>Time</span>
                    <span className={`text-3xl font-bold tabular-nums ${timeRemaining <= 30 ? 'text-status-danger animate-pulse' : ''}`}>
                        {formatTime(timeRemaining)}
                    </span>
                </div>
            )}
        </div>
    )

    // ─── Render ──────────────────────────────────────────────────────────────────

    return (
        <div className='flex flex-col lg:flex-row lg:justify-center h-full gap-2 lg:gap-4'>

            {/* ══ MAIN COLUMN (board + peripheral rows) ══ */}
            <div className='flex flex-col flex-1 min-h-0 min-w-0 lg:flex-none lg:w-auto'>

                {/* MOBILE: stats + mini-boards in one row [sm:hidden] */}
                {isPlaying && (
                    <div className='sm:hidden flex flex-row justify-center items-stretch shrink-0 w-full h-25 gap-2 overflow-hidden'>
                        {mobileStats}
                        {hasMiniboards && (
                            <div className='flex flex-row items-stretch gap-1 flex-1 min-w-0'>
                                {activeOpponents.map(p => (
                                    <div key={p.playerId} className='flex-1 min-w-0 flex flex-col'>
                                        <MiniBoard
                                            playerName={p.playerName}
                                            playState={p.state.playState}
                                            stack={opponentBoards[p.playerId]?.stack ?? createEmptyStack()}
                                            hideLabel
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TABLET: stats row [hidden sm:flex lg:hidden] */}
                {isPlaying && (
                    <div className='hidden sm:flex lg:hidden justify-center shrink-0 py-2'>
                        {tabletStats}
                    </div>
                )}

                {/* BOARD */}
                <div
                    ref={boardContainerRef}
                    className='relative flex-1 min-h-0 w-full lg:w-auto flex items-center justify-center overflow-hidden'
                >
                    <canvas
                        ref={canvasRef}
                        width={boardSize.width}
                        height={boardSize.height}
                        className='block'
                        style={{ width: boardSize.width, height: boardSize.height }}
                        role='img'
                        aria-label={`Tetris board — Score: ${score}, Level: ${level}`}
                        tabIndex={0}
                    />
                    {isEndgame && (
                        <EndgameOverlay won={gameWon.current} score={score} level={level} totalLines={totalLines} />
                    )}
                    {isPaused && !isEndgame && (
                        <div className='absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-4'>
                            <p className='text-3xl font-bold uppercase tracking-widest text-white'>Paused</p>
                            <button
                                onClick={togglePause}
                                className='px-6 py-2 text-sm font-semibold uppercase tracking-wide bg-brand rounded-sm hover:bg-brand-hover transition-colors focus:outline-hidden focus:ring-2 focus:ring-brand focus:ring-offset-2'
                            >
                                Resume
                            </button>
                        </div>
                    )}
                </div>

                {/* TABLET: mini-boards row [hidden sm:flex lg:hidden] */}
                {isPlaying && hasMiniboards && (
                    <div className='hidden sm:flex lg:hidden flex-row items-stretch justify-center gap-2 shrink-0 h-64 py-1'>
                        {activeOpponents.map(p => (
                                <MiniBoard
                                    key={p.playerId}
                                    playerName={p.playerName}
                                    playState={p.state.playState}
                                    stack={opponentBoards[p.playerId]?.stack ?? createEmptyStack()}
                                />
                        ))}
                    </div>
                )}

                {/* D-PAD [lg:hidden, playing only] */}
                {isPlaying && playerState.playState === PlayState.PLAYING && (
                    <div className='lg:hidden shrink-0'>
                        <DPad disabled={isPaused} />
                    </div>
                )}

                {/* DESKTOP: chat passed in as bottomSlot */}
                {bottomSlot && (
                    <div className='hidden lg:flex flex-col shrink-0 h-40 mt-2 overflow-hidden'>
                        {bottomSlot}
                    </div>
                )}
            </div>

            {/* ══ DESKTOP SIDEBAR [hidden lg:flex] ══ */}
            {isPlaying && (
                <aside className='hidden lg:flex flex-col gap-4 w-96 shrink-0'>

                    {/* Stats: Next / Score / Level / Time */}
                    <div className='flex flex-col gap-3 shrink-0'>
                        <div className='flex flex-col gap-1'>
                            <span className='text-xs font-semibold uppercase tracking-wide text-content-secondary'>Next</span>
                            <canvas ref={previewDesktopRef} width={90} height={50}
                                className='rounded-sm' style={{ width: 120, height: 67 }} />
                        </div>
                        <div className='flex flex-col'>
                            <span className='text-xs font-semibold uppercase tracking-wide text-content-secondary'>Score</span>
                            <span className='text-2xl font-bold tabular-nums'>{score}</span>
                        </div>
                        <div className='flex flex-col'>
                            <span className='text-xs font-semibold uppercase tracking-wide text-content-secondary'>Level</span>
                            <span className='text-2xl font-bold'>{level}</span>
                        </div>
                        {isTimeAttack && timeRemaining >= 0 && (
                            <div className='flex flex-col'>
                                <span className='text-xs font-semibold uppercase tracking-wide text-content-secondary'>Time</span>
                                <span className={`text-2xl font-bold tabular-nums ${timeRemaining <= 30 ? 'text-status-danger animate-pulse' : ''}`}>
                                    {formatTime(timeRemaining)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Opponent mini-boards: 1-col for 1 opponent, 2-col grid for 2–3 */}
                    {hasMiniboards && (
                        <div
                            className={`flex-1 min-h-0 grid gap-2 [grid-auto-rows:1fr] ${activeOpponents.length <= 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
                            aria-label='Opponent boards'
                        >
                            {activeOpponents.map((p, i) => (
                                <div key={p.playerId} className='min-h-0 overflow-hidden flex flex-col'>
                                    <MiniBoard
                                        playerName={p.playerName}
                                        playState={p.state.playState}
                                        stack={opponentBoards[p.playerId]?.stack ?? createEmptyStack()}
                                        tileSize={effectiveMiniTile}
                                        onContainerResize={i === 0 ? handleContainerResize : undefined}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </aside>
            )}
        </div>
    )
}

export default GameClient
