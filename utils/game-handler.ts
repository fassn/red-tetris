import { RemoteSocket, Server, Socket } from "socket.io"
import { DefaultEventsMap } from "socket.io/dist/typed-events"
import { cleanStores, messageStore, sessionStore } from "../pages/api/socket-handler"
import { SPACING, TILEWIDTH } from "./config"
import { Player } from "./game"
import { Message } from "./message-store"

export interface RemoteSocketWithProps extends RemoteSocket<DefaultEventsMap, any> {
    playerName: string
    playerId: string
}

const GameHandler = (io: Server, socket: Socket) => {
    // Join room upon connection
    socket.join(socket.data.roomName)
    socket.emit('session', { sessionId: socket.data.sessionId, playerId: socket.data.playerId })
    socket.emit('messages', socket.data.messages)

    let isGameLeader = false
    const setGameLeader = async () => {
        const sockets = (await io.in(socket.data.roomName).fetchSockets() as unknown) as RemoteSocketWithProps[]
        if (sockets.length === 1) {
            isGameLeader = true
            addPlayer()
            io.to(socket.data.roomName).emit('setGameLeader', sockets[0].data.playerName)
        } else {
            isGameLeader = false
        }
    }
    setGameLeader()

    const setReady = (isReady: boolean) => {
        if (isReady) {
            addPlayer()
        } else {
            socket.data.game.removePlayer(socket.data.playerId)
        }
        io.to(socket.data.roomName).emit('isOpponentReady', isReady)
    }

    const addPlayer = () => {
        let hasPlayer = false
        for (const player of socket.data.game.players) {
            if (player.id === socket.data.playerId) {
                hasPlayer = true
            }
        }
        if (!hasPlayer) {
            socket.data.game.addPlayer(new Player(socket.data.playerId, socket.id, socket.data.playerName))
        }
    }

    const startGame = async () => {
        socket.data.game.isStarted = true

        for (const player of socket.data.game.players) {
            io.to(player.socketId).emit('newGame', { newStack: player.stack, firstPiece: player.pieces[0], secondPiece: player.pieces[1] })
        }

        io.to(socket.data.roomName).emit('hasStarted', true)
    }

    const moveDown = () => {

        const playerStack = socket.data.game.getPlayerStack(socket.data.playerId)
        const playerCurrentPiece = socket.data.game.getPlayerPieces(socket.data.playerId)[0]
        playerCurrentPiece.down(playerStack)
        const newY = playerCurrentPiece.getY()
        io.to(socket.id).emit('newMoveDown', newY)
    }

    const moveLeft = () => {

        const playerStack = socket.data.game.getPlayerStack(socket.data.playerId)
        const playerCurrentPiece = socket.data.game.getPlayerPieces(socket.data.playerId)[0]
        playerCurrentPiece.setX(playerCurrentPiece.getX() - TILEWIDTH - SPACING, playerStack)
        const newX = playerCurrentPiece.getX()
        io.to(socket.id).emit('newMoveLeft', newX)
    }

    const moveRight = () => {

        const playerStack = socket.data.game.getPlayerStack(socket.data.playerId)
        const playerCurrentPiece = socket.data.game.getPlayerPieces(socket.data.playerId)[0]
        playerCurrentPiece.setX(playerCurrentPiece.getX() + TILEWIDTH + SPACING, playerStack)
        const newX = playerCurrentPiece.getX()
        io.to(socket.id).emit('newMoveRight', newX)
    }

    const rotate = () => {

        const playerStack = socket.data.game.getPlayerStack(socket.data.playerId)
        const playerCurrentPiece = socket.data.game.getPlayerPieces(socket.data.playerId)[0]
        if (playerCurrentPiece.rotate(playerStack)) {
            const newPoints = playerCurrentPiece.getPoints()
            io.to(socket.id).emit('newPoints', newPoints)
        }
    }

    const createdMessage = (msg: Message) => {
        socket.to(socket.data.roomName).emit('newIncomingMsg', msg)
        messageStore.saveMessage(socket.data.roomName, msg)
    }

    const onDisconnect = async () => {
        setGameLeader()

        socket.data.game.removePlayer(socket.data.playerId)

        sessionStore.saveSession(socket.data.sessionId, {
            playerId: socket.data.playerId,
            playerName: socket.data.playerName,
            roomName: socket.data.roomName,
        });

        const sockets = (await io.in(socket.data.roomName).fetchSockets() as unknown) as RemoteSocketWithProps[]
        if (sockets.length === 0) {
            cleanStores(socket.data.roomName)
        }
    }

    const quitGame = () => {
        io.to(socket.id).emit('resetGame')
    }

    socket.on('setReady', setReady)
    socket.on('startGame', startGame)

    socket.on('moveDown', moveDown)
    socket.on('moveLeft', moveLeft)
    socket.on('moveRight', moveRight)
    socket.on('rotate', rotate)

    socket.on('disconnect', onDisconnect)
    socket.on('quitGame', quitGame)

    socket.on('createdMessage', createdMessage)
}

export default GameHandler