import dynamic from "next/dynamic"
import { P5CanvasInstance, P5WrapperProps, Sketch } from "react-p5-wrapper"
const ReactP5Wrapper = dynamic(() => import('react-p5-wrapper')
    .then(mod => mod.ReactP5Wrapper), {
    ssr: false
}) as unknown as React.NamedExoticComponent<P5WrapperProps>
import { useContext, useEffect } from "react"
import { SocketContext } from "../context/socket"
import { PlayerState, PlayState } from "../pages"

import { BACKGROUND_COLOR, CANVASHEIGHT, CANVASWIDTH, COLS, FRAMERATE, ROWS } from "../utils/config"
import { drawLose, drawNextPiece, drawPiece, drawScore, drawStack, drawWin, getCascadeTiles, TileProps } from "../utils/draw"
import { PieceProps, Stack } from "../utils/game"

enum ARROW {
    UP,
    DOWN = 40,
    LEFT = 37,
    RIGHT = 39
}

type GameClientProps = {
    playerState: PlayerState,
}

let color = BACKGROUND_COLOR
let currentPiece: PieceProps = {
    x: 0,
    y: 0,
    points: [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}],
    color: { r: color.r, g: color.g, b: color.b }
}
let nextPiece: PieceProps = {
    x: 0,
    y: 0,
    points: [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}],
    color: { r: color.r, g: color.g, b: color.b }
}

let stack = function () {
    let newStack = new Array<Stack>(ROWS*COLS)
    for (let i = 0; i < ROWS*COLS; i++) {
        newStack[i] = { isFilled: false, color: { r: 0, g: 0, b: 0, a: 0 } }
    }
    return newStack
}()

let getCascadeTilesCalled = false
let cascadeTiles: TileProps[] = []

let score = 0
let gameWon = false

const GameClient = ({ playerState }: GameClientProps) => {
    const socket = useContext(SocketContext)

    useEffect(() => {
        socket.on('newGame', ({ newStack, firstPiece, secondPiece }: { newStack: Stack[], firstPiece: PieceProps, secondPiece: PieceProps}) => {
            stack = newStack
            currentPiece = firstPiece
            nextPiece = secondPiece
        })

        socket.on('newStack', ({ newStack, newScore }: { newStack: Stack[], newScore: number }) => {
            stack = newStack
            score = newScore
        })

        socket.on('newPosition', (newY) => {
            currentPiece.y = newY
        })

        socket.on('newPiece', ({ newCurrentPiece, newNextPiece }: { newCurrentPiece: PieceProps, newNextPiece: PieceProps }) => {
            currentPiece = newCurrentPiece
            nextPiece = newNextPiece
        })

        socket.on('newMoveDown', (newY) => {
            currentPiece.y = newY
        })

        socket.on('newMoveLeft', (newX) => {
            currentPiece.x = newX
        })

        socket.on('newMoveRight', (newX) => {
            currentPiece.x = newX
        })

        socket.on('newPoints', (newPoints) => {
            currentPiece.points = newPoints
        })

        socket.on('gameWon', () => {
            gameWon = true
        })

        socket.on('resetGame', () => {
            currentPiece = {
                x: 0,
                y: 0,
                points: [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}],
                color: { r: color.r, g: color.g, b: color.b }
            }
            nextPiece = {
                x: 0,
                y: 0,
                points: [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}],
                color: { r: color.r, g: color.g, b: color.b }
            }
            stack = function () {
                let newStack = new Array<Stack>(ROWS*COLS)
                for (let i = 0; i < ROWS*COLS; i++) {
                    newStack[i] = { isFilled: false, color: { r: 0, g: 0, b: 0, a: 0 } }
                }
                return newStack
            }()
            getCascadeTilesCalled = false
            cascadeTiles = []
            score = 0
            gameWon = false
        })
    }, [])

    const sketch: Sketch = (p5) => {
        p5.setup = () => {
            p5.createCanvas(CANVASWIDTH, CANVASHEIGHT)
            p5.frameRate(FRAMERATE)
        }
        p5.draw = () => {
            drawStack(p5, stack)
            if (playerState.playState === PlayState.PLAYING) {
                handleKeyboard(p5)
                drawPiece(p5, currentPiece)
                drawNextPiece(p5, nextPiece)
                drawScore(p5, score)
            }
            if (playerState.playState === PlayState.ENDGAME) {
                handleMouse(p5)
                if (gameWon) {
                    if (!getCascadeTilesCalled) {
                        getCascadeTiles(cascadeTiles, stack)
                        getCascadeTilesCalled = true
                    }
                    drawWin(p5, stack, cascadeTiles)
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