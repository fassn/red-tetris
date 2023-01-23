import dynamic from "next/dynamic"
import { useContext } from "react"
import { P5CanvasInstance, P5WrapperProps, Sketch } from "react-p5-wrapper"
const ReactP5Wrapper = dynamic(() => import('react-p5-wrapper')
    .then(mod => mod.ReactP5Wrapper), {
    ssr: false
}) as unknown as React.NamedExoticComponent<P5WrapperProps>
import { SocketContext } from "../context/socket"
import { CANVASHEIGHT, CANVASWIDTH, FRAMERATE, SPACING, TILEHEIGHT, TILEWIDTH } from "../utils/config"
import { Piece, PieceProps, Playground } from "../utils/game-client"
import { useEffectAfterMount } from "../utils/hooks"

enum ARROW {
    UP,
    DOWN = 40,
    LEFT = 37,
    RIGHT = 39
}

const Game = () => {
    const socket = useContext(SocketContext)

    useEffectAfterMount(() => {
        socket.on('firstPieces', (pieces: { firstPiece: PieceProps, secondPiece: PieceProps }) => {
            currentPiece = pieces.firstPiece
            nextPiece = pieces.secondPiece
        })

        socket.on('newIncomingPiece', (newPiece: PieceProps) => {
            currentPiece = nextPiece
            nextPiece = newPiece
        })
    }, [])
    socket.emit('fetchFirstPieces')
    const pg: Playground = new Playground()
    let currentPiece: PieceProps = { type: 'left_L', color: [255, 0, 0] }
    let nextPiece: PieceProps = { type: 'bar', color: [255, 0, 0] }

    const sketch: Sketch = (p5) => {

        let piece = new Piece(currentPiece)

        p5.setup = () => {
            p5.createCanvas(CANVASWIDTH, CANVASHEIGHT)
            p5.frameRate(FRAMERATE)
        }
        let accuDelta = 0
        let tickRate = 1000 / FRAMERATE
        p5.draw = () => {
            p5.background(250);
            pg.draw(p5)

            handleKeyboard(p5, piece)

            piece.draw(p5)
            accuDelta += p5.deltaTime
            if (accuDelta >= tickRate) {
                accuDelta -= tickRate
                tickRate = p5.deltaTime
                if (p5.frameCount % FRAMERATE === 0) {
                    const dy = 1
                    const newY = piece.getY() + dy * (TILEHEIGHT + SPACING)
                    piece.setY(newY, pg.stack)
                    if (!piece.isActive() && !piece.isDisabled()) {
                        socket.emit('fetchNewPiece')
                        piece.disable()
                        pg.addToStack(piece)
                        piece = new Piece(nextPiece)
                    }
                }
            }
        }
    }

    const handleKeyboard = (p5: P5CanvasInstance, piece: Piece) => {
        if (p5.keyIsDown(ARROW.DOWN)) {
            piece.down(pg.stack)
        }
        if (p5.keyIsDown(ARROW.LEFT)) {
            piece.setX(piece.getX() - TILEWIDTH - SPACING, pg.stack)
        }
        if (p5.keyIsDown(ARROW.RIGHT)) {
            piece.setX(piece.getX() + TILEWIDTH + SPACING, pg.stack)
        }
        p5.keyPressed = (event: KeyboardEvent) => {
            if (event.key ===  'ArrowUp') {
                if (piece.canRotate(pg.stack)) {
                    piece.rotate()
                }
            }
        }
    }

    return (
        <ReactP5Wrapper sketch={sketch} />
    )
}

export default Game