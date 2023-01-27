import dynamic from "next/dynamic"
import { P5CanvasInstance, P5WrapperProps, Sketch } from "react-p5-wrapper"
const ReactP5Wrapper = dynamic(() => import('react-p5-wrapper')
    .then(mod => mod.ReactP5Wrapper), {
    ssr: false
}) as unknown as React.NamedExoticComponent<P5WrapperProps>
import { useEffectAfterMount } from "../utils/hooks"
import { useContext } from "react"
import { SocketContext } from "../context/socket"
import { ALPHA_MIN, APP_BACKGROUND_COLOR, BACKGROUND_COLOR, BOARDHEIGHT, BOARDWIDTH, CANVASHEIGHT, CANVASWIDTH, COLOR_PALETTE, COLS, FRAMERATE, RADIUS, ROWS, SPACING, TILEHEIGHT, TILEWIDTH } from "../utils/config"
import { PieceProps, PieceType, RGBA, Stack } from "../utils/game"
import { Point, POINTS } from "../utils/points"
import { PIECES_RAIN } from "../utils/config"

enum ARROW {
    UP,
    DOWN = 40,
    LEFT = 37,
    RIGHT = 39
}

type TileProps = {
    x: number
    y: number
    dy: number
    gravity: number
    friction: number
    color: RGBA
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
let gameOver = false
let gameWon = false

const getRandomProps = (): { points: [Point, Point, Point, Point], min_h: number, max_h: number, color: RGBA, dy: number, gravity: number, friction: number } => {
    const dy = 1
    const gravity = 1
    const friction = 0.9

    const types: PieceType[] = ['bar', 'left_L', 'right_L', 'cube', 'T', 'Z', 'rev_Z']
    const type: PieceType = types[Math.floor(Math.random() * types.length)]

    let points: [Point, Point, Point, Point] = structuredClone(POINTS[type][Math.floor(Math.random() * 3)])
    let randomX = Math.floor(Math.random() * 8) * (TILEWIDTH + SPACING) - TILEWIDTH - SPACING
    let randomY = Math.floor(Math.random() * 10) * (TILEHEIGHT + SPACING)

    let min_h = BOARDHEIGHT
    let max_h = 0
    for (let i = 0; i < 4; i++) {
        points[i].x += + randomX
        points[i].y += + randomY
        if (max_h < points[i].y) {
            max_h = points[i].y
        }
        if (min_h > points[i].y) {
            min_h = points[i].y
        }
    }

    const colors: RGBA[] = COLOR_PALETTE
    const randomAlpha = Math.floor(Math.random() * (255 - ALPHA_MIN)) + ALPHA_MIN
    const color: RGBA = {...colors[Math.floor(Math.random() * colors.length)], a: randomAlpha}

    return { points, min_h, max_h, color, dy, gravity, friction }
}

const piecesProps: { points: [Point, Point, Point, Point], min_h: number, max_h: number, color: RGBA, dy: number, gravity: number, friction: number }[] = []
for (let i = 0; i < PIECES_RAIN; i++) {
    piecesProps.push(getRandomProps())
}

const GameClient = () => {
    const socket = useContext(SocketContext)

    useEffectAfterMount(() => {

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
            gameOver = true
            gameWon = true
            socket.emit('gameIsOver')
        })

        socket.on('gameLost', () => {
            gameOver = true
        })
    }, [])

    const sketch: Sketch = (p5) => {
        p5.setup = () => {
            p5.createCanvas(CANVASWIDTH, CANVASHEIGHT)
            p5.frameRate(FRAMERATE)
        }
        p5.draw = () => {
            if (!gameOver) {
                drawStack(p5)
                handleKeyboard(p5)
                drawPiece(p5)
                drawNextPiece(p5)
                drawScore(p5)
            } else {
                if (gameWon) {
                    if (!getCascadeTilesCalled) {
                        getCascadeTiles()
                    }
                    drawWin(p5)
                } else {
                    drawLose(p5)
                }
            }
        }
    }

    const drawWin = (p5: P5CanvasInstance) => {
        // redraw interline spacings
        const color = APP_BACKGROUND_COLOR
        p5.fill(color.r, color.g, color.b)
        p5.stroke(255,255,255)
        p5.rect(0, 0, BOARDWIDTH, BOARDHEIGHT)

        // reset stack tiles
        stack = function () {
            let newStack = new Array<Stack>(ROWS*COLS)
            for (let i = 0; i < ROWS*COLS; i++) {
                newStack[i] = { isFilled: false, color: { r: 0, g: 0, b: 0, a: 0 } }
            }
            return newStack
        }()
        drawStack(p5)

        // draw cascade tiles
        for (let tile of cascadeTiles) {
            if (tile.y > BOARDHEIGHT - TILEHEIGHT + SPACING) {
                tile.dy = -tile.dy
            } else {
                tile.dy += tile.gravity
            }
            p5.fill(tile.color.r, tile.color.g, tile.color.b, tile.color.a)
            p5.rect(tile.x, tile.y, TILEWIDTH, TILEHEIGHT, RADIUS)
            tile.y += tile.dy
        }

        // "ATTA BOY!!!" text
        p5.fill(0,0,0)
        p5.textSize(55)
        p5.textFont('Helvetica')
        p5.text('ATTA BOY!!!', 5, BOARDHEIGHT / 2 )
    }

    const getCascadeTiles = () => {
        for (let col = 0; col < COLS; col++) {
            for (let row = 0; row < ROWS; row++) {
                if (stack[row * COLS + col].isFilled) {
                    const tile: TileProps = {
                        x: col * (TILEWIDTH + SPACING),
                        y: row * (TILEHEIGHT + SPACING),
                        dy: 1,
                        gravity: 1,
                        friction: 0.9,
                        color: stack[row * COLS + col].color
                    }
                    cascadeTiles.push(tile)
                }
            }
        }
        getCascadeTilesCalled = true
    }

    let i = 0;
    const drawLose = (p5: P5CanvasInstance) => {
        const colors: RGBA[] = COLOR_PALETTE
        p5.fill(colors[i].r, colors[i].g, colors[i].b)
        p5.stroke(255,255,255)
        p5.rect(0, 0, BOARDWIDTH, BOARDHEIGHT)

        p5.fill(0,0,0)
        p5.textSize(55)
        p5.textFont('Helvetica')
        p5.text('YOU SUCK', 15, BOARDHEIGHT / 2 )

        i++
        if (i % 3 === 0) {
            i = 0
        }
    }

    const drawStack = (p5: P5CanvasInstance) => {
        let x = 0
        let y = 0
        const bg = BACKGROUND_COLOR
        p5.fill(bg.r, bg.g, bg.b)
        p5.stroke(255,255,255)
        for (let i = 0; i < COLS; i++) {
            for (let j = 0; j < ROWS; j++) {
                const tile = stack[j * COLS + i]
                if (tile.isFilled) {
                    p5.fill(tile.color.r, tile.color.g, tile.color.b)
                    p5.rect(x, y, TILEWIDTH, TILEHEIGHT, RADIUS)
                } else {
                    p5.fill(bg.r, bg.g, bg.b)
                    p5.rect(x, y, TILEWIDTH, TILEHEIGHT, RADIUS)
                }
                y += TILEHEIGHT + SPACING
            }
            y = 0
            x += TILEWIDTH + SPACING
        }
    }

    const drawPiece = (p5: P5CanvasInstance) => {
        p5.fill(currentPiece.color.r, currentPiece.color.g, currentPiece.color.b)
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

    const drawNextPiece = (p5: P5CanvasInstance) => {
        // cover previous NextPiece
        const color = APP_BACKGROUND_COLOR
        p5.fill(color.r, color.g, color.b)
        p5.noStroke()
        p5.rect(BOARDWIDTH, 0, 320, 128)

        // "Next:" text
        p5.fill(0,0,0)
        p5.textSize(38)
        p5.textFont('Helvetica')
        p5.text('Next:', BOARDWIDTH + 32, 32)

        p5.fill(nextPiece.color.r, nextPiece.color.g, nextPiece.color.b)
        for (let i = 0; i < 4; i++) {
            const newX = nextPiece.x + nextPiece.points[i].x + (TILEWIDTH + SPACING) * 7
            const newY = nextPiece.y + nextPiece.points[i].y + (TILEWIDTH + SPACING) * 2
            p5.rect(
                newX,
                newY,
                TILEWIDTH,
                TILEHEIGHT,
                RADIUS
            )
        }
    }

    const drawScore = (p5: P5CanvasInstance) => {
        // cover previous score
        const color = APP_BACKGROUND_COLOR
        p5.fill(color.r, color.g, color.b)
        p5.noStroke()
        p5.rect(BOARDWIDTH, 196, 320, 128)

        // "Score:" text
        p5.fill(0,0,0)
        p5.textSize(38)
        p5.textFont('Helvetica')
        p5.text('Score:', BOARDWIDTH + 32, 224)

        p5.text(score, BOARDWIDTH + 32, 288)
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

    return (
        <ReactP5Wrapper sketch={sketch} />
    )
}

export default GameClient