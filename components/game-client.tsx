import { useContext, useEffect, useRef } from "react"
import { SocketContext } from "../context/socket"

import { CANVASHEIGHT, CANVASWIDTH, TICK_RATE } from "../shared/config"
import { drawLose, drawNextPiece, drawPiece, drawScore, drawStack, drawWin, drawLevel, getCascadeTiles } from "../utils/draw"
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
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const keysDown = useRef(new Set<string>())

    const stack = useRef<Stack[]>(createEmptyStack())
    const currentPiece = useRef<PieceProps>(createEmptyPiece())
    const nextPiece = useRef<PieceProps>(createEmptyPiece())
    const getCascadeTilesCalled = useRef<boolean>(false)
    const cascadeTiles = useRef<TileProps[]>([])
    const score = useRef<number>(0)
    const level = useRef<number>(0)
    const gameWon = useRef<boolean>(false)
    const loseColorIndex = useRef<number>(0)

    useListeners({ stack, currentPiece, nextPiece, score, level, gameWon, cascadeTiles, getCascadeTilesCalled })

    // Render loop — throttled to TICK_RATE to match server tick rate
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animId: number
        let lastFrame = 0
        const interval = 1000 / TICK_RATE

        const render = (timestamp: number) => {
            animId = requestAnimationFrame(render)
            if (timestamp - lastFrame < interval) return
            lastFrame = timestamp - ((timestamp - lastFrame) % interval)

            drawStack(ctx, stack.current)

            if (playerState.playState === PlayState.PLAYING) {
                if (keysDown.current.has('ArrowDown')) {
                    socket.emit('moveDown')
                }
                drawPiece(ctx, currentPiece.current)
                drawNextPiece(ctx, nextPiece.current)
                drawScore(ctx, score.current)
                drawLevel(ctx, level.current)
            }

            if (playerState.playState === PlayState.ENDGAME) {
                if (gameWon.current) {
                    if (!getCascadeTilesCalled.current) {
                        getCascadeTiles(cascadeTiles.current, stack.current)
                        getCascadeTilesCalled.current = true
                    }
                    drawWin(ctx, stack.current, cascadeTiles.current)
                } else {
                    loseColorIndex.current = drawLose(ctx, loseColorIndex.current)
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
            keysDown.current.add(e.key)
            if (e.key === 'ArrowUp') socket.emit('rotate')
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
        <div className='flex flex-col items-center gap-4 lg:flex-row lg:items-start'>
            <canvas
                ref={canvasRef}
                width={CANVASWIDTH}
                height={CANVASHEIGHT}
                className='max-w-full h-auto'
                onClick={handleClick}
                role='img'
                aria-label='Tetris game board. Use arrow keys to move and rotate pieces.'
                tabIndex={0}
            />
            {isPlaying && otherPlayers.length > 0 && (
                <aside className='flex flex-row lg:flex-col gap-3' aria-label='Opponent boards'>
                    {otherPlayers.map((p) => {
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
    )
}

export default GameClient