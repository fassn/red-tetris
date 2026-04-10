import { useContext, useEffect, useRef, useState } from "react"
import { SocketContext } from "../context/socket"
import { useTheme } from "../context/theme"

import { BOARDHEIGHT, BOARDWIDTH, PIECE_COLOR_LIST, SOFT_DROP_MS, TICK_RATE } from "../shared/config"
import { drawLose, drawPiece, drawStack, drawWin, getCascadeTiles, advanceWinAnimation, clearCanvas, drawPreviewPiece, syncCanvasTheme } from "../utils/draw"
import { createEmptyPiece, createEmptyStack } from "../shared/stack"
import useListeners from "../hooks/use-listeners"
import { PieceProps, PlayerState, PlayState, RoomPlayer, Stack, TileProps } from "../shared/types"
import MiniBoard from "./mini-board"
import type { OpponentBoard } from "../pages/index"

type GameClientProps = {
    playerState: PlayerState,
    opponentBoards: Map<string, OpponentBoard>,
    otherPlayers: RoomPlayer[],
}

const GameClient = ({ playerState, opponentBoards, otherPlayers }: GameClientProps) => {
    const socket = useContext(SocketContext)
    const { theme } = useTheme()
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
    const gameWon = useRef<boolean>(false)
    const loseColorIndex = useRef<number>(0)

    // Sync canvas background colors with CSS theme
    useEffect(() => {
        syncCanvasTheme()
    }, [theme])

    useListeners({ stack, currentPiece, setNextPiece, setScore, setLevel, gameWon, cascadeTiles, getCascadeTilesCalled })

    // Draw next piece preview when it changes or theme switches
    useEffect(() => {
        const canvas = previewRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        drawPreviewPiece(ctx, nextPiece)
    }, [nextPiece, theme])

    // Render loop — throttled to TICK_RATE to match server tick rate
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
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

                if (gameWon.current) {
                    if (!getCascadeTilesCalled.current) {
                        getCascadeTiles(cascadeTiles.current, stack.current)
                        getCascadeTilesCalled.current = true
                    }
                    if (shouldAdvance) advanceWinAnimation(cascadeTiles.current)
                    drawWin(ctx, stack.current, cascadeTiles.current)
                } else {
                    if (shouldAdvance) {
                        loseColorIndex.current = (loseColorIndex.current + 1) % PIECE_COLOR_LIST.length
                    }
                    drawLose(ctx, loseColorIndex.current)
                }
            }
        }

        animId = requestAnimationFrame(render)
        return () => cancelAnimationFrame(animId)
    }, [playerState.playState, socket])

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

    const handleClick = () => {
        if (playerState.playState === PlayState.ENDGAME) {
            socket.emit('quitGame')
        }
    }

    const isPlaying = playerState.playState === PlayState.PLAYING || playerState.playState === PlayState.ENDGAME

    return (
        <div className='flex flex-col sm:flex-row gap-3 items-center sm:items-start h-[calc(100dvh-5.5rem)] sm:h-auto'>
            {isPlaying && (
                <div className='order-1 sm:order-2 flex flex-row sm:flex-col items-center sm:items-start justify-center sm:justify-between gap-3 sm:gap-0 flex-shrink-0 w-full sm:w-auto sm:h-[638px]'>
                    <div className='flex flex-col items-center sm:items-start gap-3 sm:gap-4'>
                        <div className='flex flex-col gap-1'>
                            <span className='text-xs font-semibold uppercase tracking-wide text-content-secondary'>Next</span>
                            <canvas
                                ref={previewRef}
                                width={90}
                                height={50}
                                className='rounded'
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
                    </div>
                    {otherPlayers.filter(p => p.state.playState === PlayState.PLAYING || p.state.playState === PlayState.ENDGAME).length > 0 && (
                        <aside className='flex flex-row gap-3' aria-label='Opponent boards'>
                            {otherPlayers
                                .filter(p => p.state.playState === PlayState.PLAYING || p.state.playState === PlayState.ENDGAME)
                                .map((p) => {
                                const board = opponentBoards.get(p.playerId)
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
            <canvas
                ref={canvasRef}
                width={BOARDWIDTH}
                height={BOARDHEIGHT}
                className='order-2 sm:order-1 block min-h-0 max-w-full w-auto sm:min-h-[auto]'
                onClick={handleClick}
                role='img'
                aria-label='Tetris game board. Use arrow keys to move and rotate pieces.'
                tabIndex={0}
            />
        </div>
    )
}

export default GameClient