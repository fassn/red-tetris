import React, { useCallback, useContext, useEffect, useRef, useState } from "react"
import { SocketContext } from "../context/socket"
import { useTheme } from "../context/theme"
import { useSound } from "../context/sound"

import { BOARDHEIGHT, BOARDWIDTH, COLS, ROWS, SOFT_DROP_MS, SPACING, TICK_RATE } from "../shared/config"
import { drawPiece, drawStack, getCascadeTiles, advanceCascadeAnimation, clearCanvas, drawPreviewPiece, syncCanvasTheme, setupHiDPI, drawEndgameBoard, setTileSize } from "../utils/draw"
import { createEmptyPiece, createEmptyStack } from "../shared/stack"
import useListeners from "../hooks/use-listeners"
import { PieceProps, PlayerState, PlayState, RoomPlayer, Stack, TileProps, GameMode } from "../shared/types"
import MiniBoard, { MINI_TILE } from "./mini-board"
import DPad from "./d-pad"
import EndgameOverlay from "./endgame-overlay"
import type { OpponentBoards } from "../hooks/use-game-state"

// Spacing between tiles within a mini-board canvas
const MINI_SPACING_VAL = 1

type GameClientProps = {
    playerState: PlayerState,
    opponentBoards: OpponentBoards,
    otherPlayers: RoomPlayer[],
    gameMode: GameMode,
    timeRemaining: number,
    bottomSlot?: React.ReactNode,
}

const GameClient = ({ playerState, opponentBoards, otherPlayers, gameMode, timeRemaining, bottomSlot }: GameClientProps) => {
    const socket = useContext(SocketContext)
    const { theme } = useTheme()
    const { play: playSound, musicEnabled, startMusic, stopMusic } = useSound()
    const canvasRef = useRef<HTMLCanvasElement>(null)
    // 3 separate preview canvases (one per breakpoint layout)
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
    // null = not yet measured; falls back to MINI_TILE until first ResizeObserver callback
    const [desktopTileSize, setDesktopTileSize] = useState<number | null>(null)

    const activeOpponents = otherPlayers.filter(p =>
        p.state.playState === PlayState.PLAYING || p.state.playState === PlayState.ENDGAME
    )

    // Board: on desktop (lg) use height-only to avoid circular sizing with lg:w-auto container.
    // On mobile/tablet the container is w-full so we constrain by both axes.
    useEffect(() => {
        const el = boardContainerRef.current
        if (!el) return
        const mq = window.matchMedia('(min-width: 1024px)')
        const computeTile = (width: number, height: number) => {
            if (width <= 0 || height <= 0) return
            const tileH = Math.floor((height - SPACING * (ROWS - 1)) / ROWS)
            const tileW = Math.floor((width - SPACING * (COLS - 1)) / COLS)
            const tile = Math.max(1, mq.matches ? tileH : Math.min(tileH, tileW))
            setBoardSize({
                width: tile * COLS + SPACING * (COLS - 1),
                height: tile * ROWS + SPACING * (ROWS - 1),
            })
        }
        const obs = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect
            computeTile(width, height)
        })
        const mqListener = () => {
            const rect = el.getBoundingClientRect()
            computeTile(rect.width, rect.height)
        }
        mq.addEventListener('change', mqListener)
        obs.observe(el)
        return () => {
            obs.disconnect()
            mq.removeEventListener('change', mqListener)
        }
    }, [])

    // Desktop mini-boards: compute tile size from the first cell's canvas-area dimensions
    const handleContainerResize = useCallback((w: number, h: number) => {
        // subtract 2px per axis for 1px border on each side
        const tileByW = Math.floor((w - 2 - (COLS - 1) * MINI_SPACING_VAL) / COLS)
        const tileByH = Math.floor((h - 2 - (ROWS - 1) * MINI_SPACING_VAL) / ROWS)
        setDesktopTileSize(Math.max(4, Math.min(tileByW, tileByH, MINI_TILE)))
    }, [])

    useEffect(() => {
        syncCanvasTheme()
    }, [theme])

    useListeners({ stack, currentPiece, setNextPiece, setScore, setLevel, setTotalLines, gameWon, cascadeTiles, getCascadeTilesCalled, playSound })

    useEffect(() => {
        if (playerState.playState === PlayState.PLAYING && musicEnabled) {
            startMusic()
        } else {
            stopMusic()
        }
        return () => { stopMusic() }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerState.playState, musicEnabled])

    // Draw next-piece preview to all 3 breakpoint canvases
    useEffect(() => {
        for (const ref of [previewMobileRef, previewTabletRef, previewDesktopRef]) {
            const canvas = ref.current
            if (!canvas) continue
            const ctx = setupHiDPI(canvas, 90, 50)
            if (!ctx) continue
            drawPreviewPiece(ctx, nextPiece)
        }
    }, [nextPiece, theme, playerState.playState])

    // Render loop — throttled to TICK_RATE
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const tileH = (boardSize.height - SPACING * (ROWS - 1)) / ROWS
        const tileW = (boardSize.width - SPACING * (COLS - 1)) / COLS
        setTileSize(tileW, tileH)
        const ctx = setupHiDPI(canvas, boardSize.width, boardSize.height)
        if (!ctx) return

        let animId: number
        let lastFrame = 0
        let lastSoftDrop = 0
        let lastAnimStep = 0
        const interval = 1000 / TICK_RATE
        const ANIM_STEP_MS = 67

        const render = (timestamp: number) => {
            animId = requestAnimationFrame(render)
            if (timestamp - lastFrame < interval) return
            lastFrame = timestamp - ((timestamp - lastFrame) % interval)

            clearCanvas(ctx)
            drawStack(ctx, stack.current)

            if (playerState.playState === PlayState.PLAYING) {
                if (keysDown.current.has('ArrowDown') && timestamp - lastSoftDrop >= SOFT_DROP_MS) {
                    socket.emit('moveDown')
                    lastSoftDrop = timestamp
                }
                drawPiece(ctx, currentPiece.current)
            }

            if (playerState.playState === PlayState.ENDGAME) {
                const shouldAdvance = timestamp - lastAnimStep >= ANIM_STEP_MS
                if (shouldAdvance) lastAnimStep = timestamp

                if (!getCascadeTilesCalled.current) {
                    getCascadeTiles(cascadeTiles.current, stack.current)
                    getCascadeTilesCalled.current = true
                }
                if (shouldAdvance) advanceCascadeAnimation(cascadeTiles.current)
                drawEndgameBoard(ctx, cascadeTiles.current)
            }
        }

        animId = requestAnimationFrame(render)
        return () => cancelAnimationFrame(animId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerState.playState, boardSize])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement)?.tagName === 'INPUT') return
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault()
            }
            if (e.key === 'ArrowUp' && !keysDown.current.has('ArrowUp')) {
                socket.emit('rotate')
            }
            keysDown.current.add(e.key)
            if (e.key === 'ArrowLeft') socket.emit('moveLeft')
            if (e.key === 'ArrowRight') socket.emit('moveRight')
        }
        const handleKeyUp = (e: KeyboardEvent) => {
            keysDown.current.delete(e.key)
        }
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [socket])

    const isPlaying = playerState.playState === PlayState.PLAYING || playerState.playState === PlayState.ENDGAME
    const isEndgame = playerState.playState === PlayState.ENDGAME
    const hasMiniboards = activeOpponents.length > 0
    const isTimeAttack = gameMode === GameMode.TIME_ATTACK
    const effectiveMiniTile = desktopTileSize ?? MINI_TILE

    const formatTime = (seconds: number) => {
        const clamped = Math.max(0, seconds)
        const m = Math.floor(clamped / 60)
        const s = clamped % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    return (
        <div className='flex flex-col lg:flex-row lg:justify-center h-full gap-2 lg:gap-4'>

            {/* MAIN COLUMN: board + below-board slots */}
            <div className='flex flex-col flex-1 min-h-0 min-w-0 items-center lg:flex-none lg:w-auto'>

                {/* MOBILE top bar: compact stats + mini-boards [sm:hidden] */}
                {isPlaying && (
                    <div className='sm:hidden flex flex-row items-stretch shrink-0 w-full gap-2 py-0.5'>
                        <div className='flex flex-row items-center gap-2 shrink-0'>
                            <div className='flex flex-col items-center gap-0.5'>
                                <span className='text-[8px] font-semibold uppercase tracking-wide text-content-secondary leading-none'>Next</span>
                                <canvas
                                    ref={previewMobileRef}
                                    width={90}
                                    height={50}
                                    className='rounded-sm'
                                    style={{ width: 90, height: 50 }}
                                />
                            </div>
                            <div className='flex flex-col gap-0.5'>
                                <div className='flex flex-col'>
                                    <span className='text-[8px] font-semibold uppercase tracking-wide text-content-secondary leading-none'>Score</span>
                                    <span className='text-sm font-bold tabular-nums'>{score}</span>
                                </div>
                                <div className='flex flex-col'>
                                    <span className='text-[8px] font-semibold uppercase tracking-wide text-content-secondary leading-none'>Lv</span>
                                    <span className='text-sm font-bold'>{level}</span>
                                </div>
                                {isTimeAttack && timeRemaining >= 0 && (
                                    <div className='flex flex-col'>
                                        <span className='text-[8px] font-semibold uppercase tracking-wide text-content-secondary leading-none'>Time</span>
                                        <span className={`text-sm font-bold tabular-nums ${timeRemaining <= 30 ? 'text-status-danger animate-pulse' : ''}`}>
                                            {formatTime(timeRemaining)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {hasMiniboards && (
                            <div className='flex flex-row items-stretch gap-1 flex-1 min-w-0 overflow-hidden'>
                                {activeOpponents.map((p) => {
                                    const board = opponentBoards[p.playerId]
                                    return (
                                        <div key={p.playerId} className='flex-1 min-w-0 flex flex-col'>
                                            <MiniBoard
                                                playerName={p.playerName}
                                                playState={p.state.playState}
                                                stack={board?.stack ?? createEmptyStack()}
                                                hideLabel={true}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* TABLET stats row [hidden sm:flex lg:hidden] */}
                {isPlaying && (
                    <div className='hidden sm:flex lg:hidden flex-row items-end justify-center gap-4 shrink-0 py-1'>
                        <div className='flex flex-col gap-0.5 items-center'>
                            <span className='text-sm font-semibold uppercase tracking-wide text-content-secondary'>Next</span>
                            <canvas
                                ref={previewTabletRef}
                                width={90}
                                height={50}
                                className='rounded-sm'
                                style={{ width: 120, height: 67 }}
                            />
                        </div>
                        <div className='flex flex-col items-center'>
                            <span className='text-sm font-semibold uppercase tracking-wide text-content-secondary'>Score</span>
                            <span className='text-3xl font-bold tabular-nums'>{score}</span>
                        </div>
                        <div className='flex flex-col items-center'>
                            <span className='text-sm font-semibold uppercase tracking-wide text-content-secondary'>Level</span>
                            <span className='text-3xl font-bold'>{level}</span>
                        </div>
                        {isTimeAttack && timeRemaining >= 0 && (
                            <div className='flex flex-col items-center'>
                                <span className='text-sm font-semibold uppercase tracking-wide text-content-secondary'>Time</span>
                                <span className={`text-3xl font-bold tabular-nums ${timeRemaining <= 30 ? 'text-status-danger animate-pulse' : ''}`}>
                                    {formatTime(timeRemaining)}
                                </span>
                            </div>
                        )}
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
                        aria-label={`Tetris game board — Score: ${score}, Level: ${level}. Use arrow keys to move and rotate pieces.`}
                        tabIndex={0}
                    />
                    {isEndgame && (
                        <EndgameOverlay
                            won={gameWon.current}
                            score={score}
                            level={level}
                            totalLines={totalLines}
                        />
                    )}
                </div>

                {/* TABLET mini-boards row [hidden sm:flex lg:hidden] */}
                {isPlaying && hasMiniboards && (
                    <div className='hidden sm:flex lg:hidden flex-row items-stretch justify-center gap-2 shrink-0 py-1 h-32'>
                        {activeOpponents.map((p) => {
                            const board = opponentBoards[p.playerId]
                            return (
                                <div key={p.playerId} className='flex-1 max-w-[60px] min-w-0 flex flex-col'>
                                    <MiniBoard
                                        playerName={p.playerName}
                                        playState={p.state.playState}
                                        stack={board?.stack ?? createEmptyStack()}
                                    />
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* D-PAD [lg:hidden, playing only] */}
                {isPlaying && playerState.playState === PlayState.PLAYING && (
                    <div className='lg:hidden w-full shrink-0'>
                        <DPad />
                    </div>
                )}

                {/* CHAT slot (desktop, passed in as bottomSlot) */}
                {bottomSlot && (
                    <div className='hidden lg:flex flex-col shrink-0 mt-2 h-42 w-full overflow-hidden'>
                        {bottomSlot}
                    </div>
                )}
            </div>

            {/* ====== DESKTOP SIDEBAR [hidden lg:flex] ====== */}
            {isPlaying && (
                <div className='hidden lg:flex flex-col gap-4 w-64 shrink-0'>

                    {/* Stats */}
                    <div className='flex flex-col gap-3 shrink-0'>
                        <div className='flex flex-col gap-0.5'>
                            <span className='text-xs font-semibold uppercase tracking-wide text-content-secondary'>Next</span>
                            <canvas
                                ref={previewDesktopRef}
                                width={90}
                                height={50}
                                className='rounded-sm'
                                style={{ width: 90, height: 50 }}
                            />
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

                    {/* Mini-boards: 1-col for single opponent, 2-col grid for 2–3 */}
                    {hasMiniboards && (
                        <aside
                            className={`flex-1 min-h-0 grid gap-2 [grid-auto-rows:1fr] ${activeOpponents.length <= 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
                            aria-label='Opponent boards'
                        >
                            {activeOpponents.map((p, i) => {
                                const board = opponentBoards[p.playerId]
                                return (
                                    <div key={p.playerId} className='min-h-0 overflow-hidden flex flex-col'>
                                        <MiniBoard
                                            playerName={p.playerName}
                                            playState={p.state.playState}
                                            stack={board?.stack ?? createEmptyStack()}
                                            tileSize={effectiveMiniTile}
                                            onContainerResize={i === 0 ? handleContainerResize : undefined}
                                        />
                                    </div>
                                )
                            })}
                        </aside>
                    )}
                </div>
            )}
        </div>
    )
}

export default GameClient