import { RemoteSocket, Server, Socket } from "socket.io"
import { DefaultEventsMap } from "socket.io/dist/typed-events"
import { cleanStores, gameStore, messageStore, sessionStore } from "../pages/api/socket-handler"
import { SPACING, TILEWIDTH } from "./config"
import { Player } from "./game"
import { Message } from "./message-store"

export interface RemoteSocketWithProps extends RemoteSocket<DefaultEventsMap, any> {
    playerName: string
    userId: string
}

const GameHandler = (io: Server, socket: Socket) => {
    // Join room upon connection
    socket.join(socket.data.roomName)

    socket.emit('session', { sessionId: socket.data.sessionId, userId: socket.data.userId })
    socket.emit('messages', socket.data.messages)

    // Join game upon connection
    const game = gameStore.findGame(socket.data.roomName)
    const addPlayer = () => {
        if (game) {
            let hasPlayer = false
            for (const player of game.players) {
                if (player.id === socket.data.userId) {
                    hasPlayer = true
                }
            }
            if (!hasPlayer) {
                game.addPlayer(new Player(socket.data.userId, socket.data.playerName))
            }
        }
    }
    addPlayer()

    const setReady = (isReady: boolean) => {
        io.to(socket.data.roomName).emit('isOpponentReady', isReady)
    }

    const setGameLeader = async () => {
        const players = []
        const sockets = (await io.in(socket.data.roomName).fetchSockets() as unknown) as RemoteSocketWithProps[]
        if (sockets.length === 1) {
            io.to(socket.data.roomName).emit('setGameLeader', sockets[0].data.playerName)
        }
    }
    setGameLeader()

    const onDisconnect = async () => {
        setGameLeader()

        sessionStore.saveSession(socket.data.sessionId, {
            userId: socket.data.userId,
            playerName: socket.data.playerName,
            roomName: socket.data.roomName
        });

        const sockets = (await io.in(socket.data.roomName).fetchSockets() as unknown) as RemoteSocketWithProps[]
        if (sockets.length === 0) {
            cleanStores(socket.data.roomName)
        }
    }

    const createdMessage = (msg: Message) => {
        socket.to(socket.data.roomName).emit('newIncomingMsg', msg)
        messageStore.saveMessage(socket.data.roomName, msg)
    }

    const startGame = async () => {
        if (!game) {
            throw new Error('Game does\'nt exist !')
        }
        game.isStarted = true

        const sockets = (await io.in(socket.data.roomName).fetchSockets() as unknown) as RemoteSocketWithProps[]
        for (const sock of sockets) {
            const playerId = sock.data.userId
            const stack = game.getPlayerStack(playerId)
            const pieces = game.getPlayerPieces(playerId)
            io.to(sock.id).emit('newGame', { newStack: stack, firstPiece: pieces[0], secondPiece: pieces[1] })
        }

        io.to(socket.data.roomName).emit('hasStarted', true)
    }

    const moveDown = () => {
        if (!game) {
            throw new Error('Game does\'nt exist when calling moveDown!')
        }
        const playerStack = game.getPlayerStack(socket.data.userId)
        const playerCurrentPiece = game.getPlayerPieces(socket.data.userId)[0]
        playerCurrentPiece.down(playerStack)
        const newY = playerCurrentPiece.getY()
        io.to(socket.id).emit('newMoveDown', newY)
    }

    const moveLeft = () => {
        if (!game) {
            throw new Error('Game does\'nt exist when calling moveLeft!')
        }
        const playerStack = game.getPlayerStack(socket.data.userId)
        const playerCurrentPiece = game.getPlayerPieces(socket.data.userId)[0]
        playerCurrentPiece.setX(playerCurrentPiece.getX() - TILEWIDTH - SPACING, playerStack)
        const newX = playerCurrentPiece.getX()
        io.to(socket.id).emit('newMoveLeft', newX)
    }

    const moveRight = () => {
        if (!game) {
            throw new Error('Game does\'nt exist when calling moveRight!')
        }
        const playerStack = game.getPlayerStack(socket.data.userId)
        const playerCurrentPiece = game.getPlayerPieces(socket.data.userId)[0]
        playerCurrentPiece.setX(playerCurrentPiece.getX() + TILEWIDTH + SPACING, playerStack)
        const newX = playerCurrentPiece.getX()
        io.to(socket.id).emit('newMoveRight', newX)
    }

    const rotate = () => {
        if (!game) {
            throw new Error('Game does\'nt exist when calling rotate!')
        }
        const playerStack = game.getPlayerStack(socket.data.userId)
        const playerCurrentPiece = game.getPlayerPieces(socket.data.userId)[0]
        if (playerCurrentPiece.rotate(playerStack)) {
            const newPoints = playerCurrentPiece.getPoints()
            io.to(socket.id).emit('newPoints', newPoints)
        }
    }

    const gameIsOver = () => {
        if (!game) {
            throw new Error('Cannot end a game that does\'nt exist!')
        }
        game.isOver = true
    }

    socket.on('createdMessage', createdMessage)

    socket.on('setReady', setReady)

    socket.on('disconnect', onDisconnect)

    socket.on('startGame', startGame)

    socket.on('moveDown', moveDown)
    socket.on('moveLeft', moveLeft)
    socket.on('moveRight', moveRight)
    socket.on('rotate', rotate)

    socket.on('gameIsOver', gameIsOver)
}

export default GameHandler