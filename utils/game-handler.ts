import { Server, Socket } from "socket.io"
import { FRAMERATE, SPACING, TILEHEIGHT, TILEWIDTH } from "./config"
import { Piece, PieceType, Game, RGB } from "./game"

const GameHandler = (io: Server, socket: Socket) => {
    const createdMessage = (msg: string) => {
        socket.broadcast.emit('newIncomingMsg', msg)
    }

    const getPiece = () => {
        const types: PieceType[] = ['bar', 'left_L', 'right_L', 'cube', 'T', 'Z', 'rev_Z']
        const type: PieceType = types[Math.floor(Math.random() * types.length)]

        const colors: RGB[] = [[255, 0, 0], [0, 255, 0], [0, 0, 255]]
        const color: RGB = colors[Math.floor(Math.random() * colors.length)]

        return { type, color }
    }

    let game: Game
    let currentPiece: Piece
    let nextPiece: Piece
    const startGame = () => {
        if (!game && !currentPiece && !nextPiece) {
            game = new Game()
            currentPiece = new Piece(getPiece())
            nextPiece = new Piece(getPiece())
        }

        const firstPiece = {
            x: currentPiece.getX(),
            y: currentPiece.getY(),
            points: currentPiece.getPoints(),
            color: currentPiece.getColor()
        }
        const secondPiece = {
            x: nextPiece.getX(),
            y: nextPiece.getY(),
            points: nextPiece.getPoints(),
            color: nextPiece.getColor()
        }

        socket.emit('newGame', { newStack: game.stack, firstPiece, secondPiece })
    }

    // const joinGame = () => {
    //     if (game && currentPiece && nextPiece) {
    //         const firstPiece = {
    //             x: currentPiece.getX(),
    //             y: currentPiece.getY(),
    //             points: currentPiece.getPoints(),
    //             color: currentPiece.getColor()
    //         }
    //         const secondPiece = {
    //             x: nextPiece.getX(),
    //             y: nextPiece.getY(),
    //             points: nextPiece.getPoints(),
    //             color: nextPiece.getColor()
    //         }
    //         socket.emit('existingGame', { newStack: game.stack, firstPiece, secondPiece })
    //     }
    // }

    const moveDown = () => {
        currentPiece.down(game.stack)
        const newY = currentPiece.getY()
        socket.emit('newMoveDown', newY)
    }
    const moveLeft = () => {
        currentPiece.setX(currentPiece.getX() - TILEWIDTH - SPACING, game.stack)
        const newX = currentPiece.getX()
        socket.emit('newMoveLeft', newX)
    }

    const moveRight = () => {
        currentPiece.setX(currentPiece.getX() + TILEWIDTH + SPACING, game.stack)
        const newX = currentPiece.getX()
        socket.emit('newMoveRight', newX)
    }

    const rotate = () => {
        if (currentPiece.canRotate(game.stack)) {
            currentPiece.rotate()
        }
        const newPoints = currentPiece.getPoints()
        socket.emit('newPoints', newPoints)
    }

    let tickRate = 1000 / FRAMERATE
    let frameCount = 0
    const gameLoop = () => {
        setTimeout(() => {
            if (frameCount % FRAMERATE === 0) {
                const newY = currentPiece.getY() + (TILEHEIGHT + SPACING)
                socket.emit('newPosition', newY)
                currentPiece.setY(newY, game.stack)
                if (!currentPiece.isActive() && !currentPiece.isDisabled()) {
                    currentPiece.disable()
                    game.addToStack(currentPiece)
                    socket.emit('newStack', game.stack)
                    currentPiece = nextPiece
                    nextPiece = new Piece(getPiece())

                    const newCurrentPiece = {
                        x: currentPiece.getX(),
                        y: currentPiece.getY(),
                        points: currentPiece.getPoints(),
                        color: currentPiece.getColor()
                    }
                    const newNextPiece = {
                        x: nextPiece.getX(),
                        y: nextPiece.getY(),
                        points: nextPiece.getPoints(),
                        color: nextPiece.getColor()
                    }
                    socket.emit('newPiece', { newCurrentPiece, newNextPiece })
                }
            }
            frameCount++
            gameLoop()
        }, tickRate)
    }
    gameLoop()

    socket.on('createdMessage', createdMessage)

    socket.on('startGame', startGame)
    // socket.on('joinGame', joinGame)

    socket.on('moveDown', moveDown)
    socket.on('moveLeft', moveLeft)
    socket.on('moveRight', moveRight)
    socket.on('rotate', rotate)
}

export default GameHandler