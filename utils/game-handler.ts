import { RemoteSocket, Server, Socket } from "socket.io"
import { DefaultEventsMap } from "socket.io/dist/typed-events"
import { PlayerState, PlayState } from "../pages"
import { cleanStores, messageStore, sessionStore } from "../pages/api/socket-handler"
import { SPACING, TILEWIDTH } from "./config"
import { Player } from "./game"
import { Message } from "./message-store"

export interface RemoteSocketWithProps extends RemoteSocket<DefaultEventsMap, any> {
    playerName: string
    playerId: string
}

const GameHandler = async (io: Server, socket: Socket) => {
    // Join room upon connection
    const allSockets = (await io.in(socket.data.roomName).fetchSockets() as unknown) as RemoteSocketWithProps[]

    if (allSockets.length === 2) {
        io.to(socket.id).emit('roomIsFull')
        socket.disconnect()
    }

    socket.join(socket.data.roomName)
    socket.emit('session', { sessionId: socket.data.sessionId, playerId: socket.data.playerId })
    socket.emit('messages', socket.data.messages)

    const setGameHostToSocket = async (socket: Socket|RemoteSocketWithProps) => {
        const sockets = (await io.in(socket.data.roomName).fetchSockets() as unknown) as RemoteSocketWithProps[]
        if (sockets.length === 1) {
            socket.data.playerState.host = true
        } else {
            socket.data.playerState.host = false
        }
        io.to(socket.id).emit('newState', { playerState: socket.data.playerState })

        const otherSocket = await getOtherSocket()
        if (otherSocket) {
            io.to(otherSocket.id).emit('newState', { otherPlayerState: socket.data.playerState })
        }
    }

    setGameHostToSocket(socket)

    const startGame = async () => {
        socket.data.game.isStarted = true
        addPlayer()

        // emit to self the new PLAYING state
        const playerSocketIds = []
        for (const player of socket.data.game.players) {
            playerSocketIds.push(player.socket.id)
            if (player.socket.data.playerState.host === true || (player.socket.data.playerState.playState === PlayState.READY)) {
                player.socket.data.playerState.playState = PlayState.PLAYING
                io.to(player.socket.id).emit('newState', { playerState: player.socket.data.playerState })
            }
            io.to(player.socket.id).emit('newGame', { newStack: player.stack, firstPiece: player.pieces[0], secondPiece: player.pieces[1] })
        }

        // emit otherPlayerState to each other players
        let otherPlayerState: PlayerState
        for (const player of socket.data.game.players) {
            if (player.socket.id !== socket.id) {
                otherPlayerState = player.socket.data.playerState
                io.to(socket.id).emit('newState', { otherPlayerState: otherPlayerState })
                io.to(player.socket.id).emit('newState', { otherPlayerState: socket.data.playerState })
            }
        }

        // finally also emit if the 2nd person is NOT a player
        let playerState = socket.data.playerState

        const otherSocket = await getOtherSocket()
        if (otherSocket) {
            if (!playerSocketIds.includes(otherSocket.id)) {
                io.to(otherSocket.id).emit('newState', { otherPlayerState: playerState })
            }
        }
    }

    const setReady = async (isReady: boolean) => {
        if (isReady) {
            addPlayer()
            socket.data.playerState.playState = PlayState.READY
        } else {
            socket.data.game.removePlayer(socket.data.playerId)
            socket.data.playerState.playState = PlayState.WAITING
        }
        const sockets = (await io.in(socket.data.roomName).fetchSockets() as unknown) as RemoteSocketWithProps[]
        for (const sock of sockets) {
            if (sock.id === socket.id) {
                io.to(sock.id).emit('newState', { playerState: socket.data.playerState })
            } else {
                io.to(sock.id).emit('newState', { otherPlayerState: socket.data.playerState })
            }
        }
    }

    const addPlayer = () => {
        let hasPlayer = false
        for (const player of socket.data.game.players) {
            if (player.id === socket.data.playerId) {
                hasPlayer = true
            }
        }
        if (!hasPlayer) {
            socket.data.game.addPlayer(new Player(socket.data.playerId, socket, socket.data.playerName))
        }
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
        const otherSocket = await getOtherSocket()
        if (otherSocket) {
            setGameHostToSocket(otherSocket)
        }

        socket.data.game.removePlayer(socket.data.playerId)

        sessionStore.saveSession(socket.data.sessionId, {
            playerId: socket.data.playerId,
            playerName: socket.data.playerName,
            roomName: socket.data.roomName,
            playerState: socket.data.playerState
        });

        const sockets = (await io.in(socket.data.roomName).fetchSockets() as unknown) as RemoteSocketWithProps[]
        if (sockets.length === 0) {
            cleanStores(socket.data.roomName)
        }
    }

    const quitGame = async () => {
        io.to(socket.id).emit('resetGame')
        socket.data.playerState.playState = PlayState.WAITING

        const sockets = (await io.in(socket.data.roomName).fetchSockets() as unknown) as RemoteSocketWithProps[]
        for (const sock of sockets) {
            if (sock.id === socket.id) {
                io.to(sock.id).emit('newState', { playerState: socket.data.playerState })
            } else {
                io.to(sock.id).emit('newState', { otherPlayerState: socket.data.playerState })
            }
        }
    }

    const getOtherSocket = async () => {
        const sockets = (await io.in(socket.data.roomName).fetchSockets() as unknown) as RemoteSocketWithProps[]
        for (const sock of sockets) {
            if (sock.id !== socket.id) {
                return sock
            }
        }
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