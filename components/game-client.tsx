import dynamic from "next/dynamic"
import { P5CanvasInstance, P5WrapperProps, Sketch } from "react-p5-wrapper"
const ReactP5Wrapper = dynamic(() => import('react-p5-wrapper')
    .then(mod => mod.ReactP5Wrapper), {
    ssr: false
}) as unknown as React.NamedExoticComponent<P5WrapperProps>
import { useContext, useRef } from "react"
import { SocketContext } from "../context/socket"

import { BACKGROUND_COLOR, CANVASHEIGHT, CANVASWIDTH, COLS, FRAMERATE, ROWS } from "../utils/config"
import { drawLose, drawNextPiece, drawPiece, drawScore, drawStack, drawWin, getCascadeTiles } from "../utils/draw"
import useListeners from "../utils/use-listeners"
import { PieceProps, PlayerState, PlayState, Stack, TileProps } from "../utils/types"

enum ARROW {
    UP,
    DOWN = 40,
    LEFT = 37,
    RIGHT = 39
}

type GameClientProps = {
    playerState: PlayerState,
}

export function initStack() {
    let newStack = new Array<Stack>(ROWS*COLS)
    for (let i = 0; i < ROWS*COLS; i++) {
        newStack[i] = { isFilled: false, color: { r: 0, g: 0, b: 0, a: 0 } }
    }
    return newStack
}

export function initPiece(): PieceProps {
    let color = BACKGROUND_COLOR
    return {
        x: 0,
        y: 0,
        points: [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}],
        color: { r: color.r, g: color.g, b: color.b }
    }
}

const GameClient = ({ playerState }: GameClientProps) => {
    const socket = useContext(SocketContext)

    const stack = useRef<Stack[]>(initStack())
    const currentPiece = useRef<PieceProps>(initPiece())
    const nextPiece = useRef<PieceProps>(initPiece())
    const getCascadeTilesCalled = useRef<boolean>(false)
    const cascadeTiles = useRef<TileProps[]>([])
    const score = useRef<number>(0)
    const gameWon = useRef<boolean>(false)

    useListeners({ stack, currentPiece, nextPiece, score, gameWon, cascadeTiles, getCascadeTilesCalled })

    const sketch: Sketch = (p5) => {
        p5.setup = () => {
            p5.createCanvas(CANVASWIDTH, CANVASHEIGHT)
            p5.frameRate(FRAMERATE)
        }
        p5.draw = () => {
            drawStack(p5, stack.current)
            if (playerState.playState === PlayState.PLAYING) {
                handleKeyboard(p5)
                drawPiece(p5, currentPiece.current)
                drawNextPiece(p5, nextPiece.current)
                drawScore(p5, score.current)
            }
            if (playerState.playState === PlayState.ENDGAME) {
                handleMouse(p5)
                if (gameWon.current) {
                    if (!getCascadeTilesCalled.current) {
                        getCascadeTiles(cascadeTiles.current, stack.current)
                        getCascadeTilesCalled.current = true
                    }
                    drawWin(p5, stack.current, cascadeTiles.current)
                }
                else {
                    drawLose(p5)
                }
            }
        }
    }

    const handleKeyboard = (p5: P5CanvasInstance) => {
        if (p5.keyIsDown(ARROW.DOWN)) {
            socket.emit('moveDown')
        }
        p5.keyPressed = (event: KeyboardEvent) => {
            if (event.key ===  'ArrowUp') {
                socket.emit('rotate')
            }
            if (event.key === 'ArrowLeft') {
                socket.emit('moveLeft')
            }
            if (event.key === 'ArrowRight') {
                socket.emit('moveRight')
            }
        }
    }

    const handleMouse = (p5: P5CanvasInstance) => {
        p5.mouseClicked = () => {
            socket.emit('quitGame')
        }
    }

    return (
        <div className='flex w-full justify-center'>
            <ReactP5Wrapper sketch={sketch} />
        </div>
    )
}

export default GameClient