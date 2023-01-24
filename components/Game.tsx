import dynamic from "next/dynamic"
import { P5CanvasInstance, P5WrapperProps, Sketch } from "react-p5-wrapper"
const ReactP5Wrapper = dynamic(() => import('react-p5-wrapper')
    .then(mod => mod.ReactP5Wrapper), {
    ssr: false
}) as unknown as React.NamedExoticComponent<P5WrapperProps>
import { useEffectAfterMount } from "../utils/hooks"
import { useContext, useState } from "react"
import { SocketContext } from "../context/socket"
import { CANVASHEIGHT, CANVASWIDTH, COLS, FRAMERATE, RADIUS, ROWS, SPACING, TILEHEIGHT, TILEWIDTH } from "../utils/config"
import { Piece, RGB, Stack } from "../utils/game"
import { Point } from "../utils/points"

enum ARROW {
    UP,
    DOWN = 40,
    LEFT = 37,
    RIGHT = 39
}

type PieceProps = {
    x: number,
    y: number,
    points: [Point, Point, Point, Point]
    color: RGB
}

let currentPiece = {
    x: 0,
    y: 0,
    points: [new Point(0, 0), new Point(0, 0), new Point(0, 0), new Point(0, 0)],
    color: [0, 0, 0]
}
let nextPiece = {
    x: 0,
    y: 0,
    points: [new Point(0, 0), new Point(0, 0), new Point(0, 0), new Point(0, 0)],
    color: [0, 0, 0]
}

let stack = function () {
    let newStack = new Array<Stack>(ROWS*COLS)
    for (let i = 0; i < ROWS*COLS; i++) {
        newStack[i] = { isFilled: false, color: [230, 230, 230] }
    }
    return newStack
}()

const Game = () => {
    const socket = useContext(SocketContext)
    const [loading, setLoading] = useState(true)


    useEffectAfterMount(() => {
        socket.emit('startGame')

        socket.on('newGame', ({ newStack, firstPiece, secondPiece }: { newStack: Stack[], firstPiece: PieceProps, secondPiece: PieceProps}) => {
            stack = newStack
            currentPiece = firstPiece
            nextPiece = secondPiece
            setLoading(false)
        })

        socket.on('newStack', (newStack: Stack[]) => {
            stack = newStack
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
    }, [])

    const sketch: Sketch = (p5) => {

        let accuDelta = 0
        let tickRate = 1000 / FRAMERATE
        p5.setup = () => {
            p5.createCanvas(CANVASWIDTH, CANVASHEIGHT)
            p5.frameRate(FRAMERATE)
        }
        p5.draw = () => {
            drawStack(p5)

            handleKeyboard(p5)

            drawPiece(p5)
        }
    }

    const drawStack = (p5: P5CanvasInstance) => {
        let x = 0
        let y = 0
        p5.fill(230, 230, 230)
        p5.stroke(255,255,255)
        for (let i = 0; i < COLS; i++) {
            for (let j = 0; j < ROWS; j++) {
                const tile = stack[j * COLS + i]
                if (tile.isFilled) {
                    p5.fill(tile.color[0], tile.color[1], tile.color[2])
                    p5.rect(x, y, TILEWIDTH, TILEHEIGHT, RADIUS)
                } else {
                    p5.fill(230, 230, 230)
                    p5.rect(x, y, TILEWIDTH, TILEHEIGHT, RADIUS)
                }
                y += TILEHEIGHT + SPACING
            }
            y = 0
            x += TILEWIDTH + SPACING
        }
    }

    const drawPiece = (p5: P5CanvasInstance) => {
        p5.fill(currentPiece.color[0], currentPiece.color[1], currentPiece.color[2])
        for (let i = 0; i < 4; i++) {
            const newX = currentPiece.x + currentPiece.points[i].x
            const newY = currentPiece.y + currentPiece.points[i].y
            p5.rect(
                newX,
                newY,
                TILEWIDTH,
                TILEHEIGHT,
                RADIUS
            )
        }
    }



    const handleKeyboard = (p5: P5CanvasInstance) => {
        if (p5.keyIsDown(ARROW.DOWN)) {
            socket.emit('moveDown')
        }
        if (p5.keyIsDown(ARROW.LEFT)) {
            socket.emit('moveLeft')
        }
        if (p5.keyIsDown(ARROW.RIGHT)) {
            socket.emit('moveRight')
        }
        p5.keyPressed = (event: KeyboardEvent) => {
            if (event.key ===  'ArrowUp') {
                socket.emit('rotate')
            }
        }
    }

    return (
        <ReactP5Wrapper sketch={sketch} />
    )
}

export default Game