import { useContext, useEffect, useRef, useState } from "react"
import { SocketContext } from "../context/socket"
import { useTheme } from "../context/theme"
import { useSound } from "../context/sound"

import { BOARDHEIGHT, BOARDWIDTH, SOFT_DROP_MS, TICK_RATE } from "../shared/config"
import { drawPiece, drawStack, getCascadeTiles, advanceCascadeAnimation, clearCanvas, drawPreviewPiece, syncCanvasTheme, setupHiDPI, drawEndgameBoard } from "../utils/draw"
import { createEmptyPiece, createEmptyStack } from "../shared/stack"
import useListeners from "../hooks/use-listeners"
import { PieceProps, PlayerState, PlayState, RoomPlayer, Stack, TileProps, GameMode } from "../shared/types"
import MiniBoard from "./mini-board"
import DPad from "./d-pad"
import EndgameOverlay from "./endgame-overlay"
import type { OpponentBoard, OpponentBoards } from "../hooks/use-game-state"

type GameClientProps = {
    playerState: PlayerState,
    opponentBoards: OpponentBoards,
    otherPlayers: RoomPlayer[],
    gameMode: GameMode,
    timeRemaining: number,
}

const GameClient = ({ playerState, opponentBoards, otherPlayers, gameMode, timeRemaining }: GameClientProps) => {
    const socket = useContext(SocketContext)
    const { theme } = useTheme()
    const { play: playSound } = useSound()
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const previewRef = useRef<HTMLCanvasElement>(null)
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

    // Sync canvas background colors with CSS theme
    useEffect(() => {
        syncCanvasTheme()
    }, [theme])

    useListeners({ stack, currentPiece, setNextPiece, setScore, setLevel, setTotalLines, gameWon, cascadeTiles, getCascadeTilesCalled, playSound })

    // Draw next piece preview when it changes or theme switches
    useEffect(() => {
        const canvas = previewRef.current
        if (!canvas) return
        const ctx = setupHiDPI(canvas, 90, 50)
        if (!ctx) return
        drawPreviewPiece(ctx, nextPiece)
    }, [nextPiece, theme])

    // Render loop — throttled to TICK_RATE to match server tick rate
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = setupHiDPI(canvas, BOARDWIDTH, BOARDHEIGHT)
        if (!ctx) return

        let animId: number
        let lastFrame = 0
        let lastSoftDrop = 0
        let lastAnimStep = 0
        const interval = 1000 / TICK_RATE
        const ANIM_STEP_MS = 67 // ~15fps for endgame animations

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
    }, [playerState.playState])

    // Keyboard controls — skip when typing in input fields
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement)?.tagName === 'INPUT') return
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault()
            }
            // Rotation: one per press, no auto-repeat
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
    const activeOpponents = otherPlayers.filter(p => p.state.playState === PlayState.PLAYING || p.state.playState === PlayState.ENDGAME)
    const hasMiniboards = activeOpponents.length > 0
    const isTimeAttack = gameMode === GameMode.TIME_ATTACK

    const formatTime = (seconds: number) => {
        const clamped = Math.max(0, seconds)
        const m = Math.floor(clamped / 60)
        const s = clamped % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    return (
        <div className='flex flex-col sm:flex-row gap-2 sm:gap-3 items-center sm:items-start h-full sm:h-auto'>
            {isPlaying && (
                <div className='order-1 sm:order-2 flex flex-row sm:flex-col items-center sm:items-start justify-center sm:justify-between gap-2 sm:gap-0 shrink-0 w-full sm:w-auto sm:h-[638px]'>
                    <div className={`flex ${hasMiniboards ? 'flex-col' : 'flex-row'} sm:flex-col items-center sm:items-start gap-2 sm:gap-4`}>
                        <div className='flex flex-col gap-1'>
                            <span className='text-xs font-semibold uppercase tracking-wide text-content-secondary'>Next</span>
                            <canvas
                                ref={previewRef}
                                width={90}
                                height={50}
                                className='rounded-sm'
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
                    {hasMiniboards && (
                        <aside className='flex flex-row gap-3' aria-label='Opponent boards'>
                            {activeOpponents.map((p) => {
                                const board = opponentBoards[p.playerId]
                                return (
                                    <MiniBoard
                                        key={p.playerId}
                                        playerName={p.playerName}
                                        playState={p.state.playState}
                                        stack={board?.stack ?? createEmptyStack()}
                                    />
                                )
                            })}
                        </aside>
                    )}
                </div>
            )}
            <div className='order-2 sm:order-1 flex flex-col items-center min-h-0 flex-1 sm:flex-none'>
                <div className='relative flex-1 min-h-0 flex items-center justify-center'>
                    <canvas
                        ref={canvasRef}
                        width={BOARDWIDTH}
                        height={BOARDHEIGHT}
                        className='block max-w-full max-h-full w-auto h-auto object-contain'
                        style={{ aspectRatio: `${BOARDWIDTH} / ${BOARDHEIGHT}` }}
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
                {isPlaying && playerState.playState === PlayState.PLAYING && (
                    <div className='lg:hidden w-full shrink-0'>
                        <DPad />
                    </div>
                )}
            </div>
        </div>
    )
}

export default GameClient