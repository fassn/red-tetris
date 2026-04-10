import { SPACING, TILEWIDTH } from "../shared/config"
import InMemoryMessageStore from "./stores/message-store"
import InMemorySessionStore from "./stores/session-store"
import Player from "./player"
import { PlayerState, PlayState, Message } from "../shared/types"
import type { TypedServer, TypedSocket, TypedRemoteSocket } from "./io-types"

export type GameDeps = {
    sessionStore: InMemorySessionStore
    messageStore: InMemoryMessageStore
    cleanStores: (roomName: string) => void
}

const GameHandler = async (io: TypedServer, socket: TypedSocket, deps: GameDeps) => {
    const sd = socket.data

    // Join room upon connection
    const allSockets = await io.in(sd.roomName).fetchSockets()

    if (allSockets.length === 2) {
        io.to(socket.id).emit('roomIsFull')
        socket.disconnect()
    }

    socket.join(sd.roomName)
    socket.emit('session', { sessionId: sd.sessionId, playerId: sd.playerId })
    socket.emit('messages', sd.messages)

    const setGameHostToSocket = async (sock: TypedSocket | TypedRemoteSocket) => {
        const sockets = await io.in(sock.data.roomName).fetchSockets()
        if (sockets.length === 1) {
            sock.data.playerState.host = true
        } else {
            sock.data.playerState.host = false
        }
        io.to(sock.id).emit('newState', { playerState: sock.data.playerState })

        const otherSocket = await getOtherSocket()
        if (otherSocket) {
            io.to(otherSocket.id).emit('newState', { otherPlayerState: sock.data.playerState })
        }
    }

    setGameHostToSocket(socket)

    const startGame = async () => {
        sd.game.isStarted = true
        addPlayer()

        // emit to self the new PLAYING state
        const playerSocketIds = []
        for (const player of sd.game.players) {
            playerSocketIds.push(player.socket.id)
            if (player.socket.data.playerState.host === true || (player.socket.data.playerState.playState === PlayState.READY)) {
                player.socket.data.playerState.playState = PlayState.PLAYING
                io.to(player.socket.id).emit('newState', { playerState: player.socket.data.playerState })
            }
            io.to(player.socket.id).emit('newGame', {
                newStack: player.stack,
                firstPiece: sd.game.getPieceProps(player.pieces[0]),
                secondPiece: sd.game.getPieceProps(player.pieces[1])
            })
        }

        // emit otherPlayerState to each other players
        let otherPlayerState: PlayerState
        for (const player of sd.game.players) {
            if (player.socket.id !== socket.id) {
                otherPlayerState = player.socket.data.playerState
                io.to(socket.id).emit('newState', { otherPlayerState: otherPlayerState })
                io.to(player.socket.id).emit('newState', { otherPlayerState: sd.playerState })
            }
        }

        // finally also emit if the 2nd person is NOT a player
        const otherSocket = await getOtherSocket()
        if (otherSocket) {
            if (!playerSocketIds.includes(otherSocket.id)) {
                io.to(otherSocket.id).emit('newState', { otherPlayerState: sd.playerState })
            }
        }
    }

    const setReady = async (isReady: boolean) => {
        if (isReady) {
            addPlayer()
            sd.playerState.playState = PlayState.READY
        } else {
            sd.game.removePlayer(sd.playerId)
            sd.playerState.playState = PlayState.WAITING
        }
        const sockets = await io.in(sd.roomName).fetchSockets()
        for (const sock of sockets) {
            if (sock.id === socket.id) {
                io.to(sock.id).emit('newState', { playerState: sd.playerState })
            } else {
                io.to(sock.id).emit('newState', { otherPlayerState: sd.playerState })
            }
        }
    }

    const addPlayer = () => {
        const existing = sd.game.players.find(
            (p: Player) => p.id === sd.playerId
        )
        if (existing) {
            existing.socket = socket
        } else {
            sd.game.addPlayer(new Player(sd.playerId, socket, sd.playerName))
        }
    }

    const isPlayerActive = (): boolean => {
        return sd.game?.isStarted === true &&
            sd.playerState?.playState === PlayState.PLAYING
    }

    const moveDown = () => {
        if (!isPlayerActive()) return
        const playerStack = sd.game.getPlayerStack(sd.playerId)
        const playerCurrentPiece = sd.game.getPlayerPieces(sd.playerId)[0]
        playerCurrentPiece.down(playerStack)
        const newY = playerCurrentPiece.getY()
        io.to(socket.id).emit('newMoveDown', newY)
    }

    const moveLeft = () => {
        if (!isPlayerActive()) return
        const playerStack = sd.game.getPlayerStack(sd.playerId)
        const playerCurrentPiece = sd.game.getPlayerPieces(sd.playerId)[0]
        playerCurrentPiece.setX(playerCurrentPiece.getX() - TILEWIDTH - SPACING, playerStack)
        const newX = playerCurrentPiece.getX()
        io.to(socket.id).emit('newMoveLeft', newX)
    }

    const moveRight = () => {
        if (!isPlayerActive()) return
        const playerStack = sd.game.getPlayerStack(sd.playerId)
        const playerCurrentPiece = sd.game.getPlayerPieces(sd.playerId)[0]
        playerCurrentPiece.setX(playerCurrentPiece.getX() + TILEWIDTH + SPACING, playerStack)
        const newX = playerCurrentPiece.getX()
        io.to(socket.id).emit('newMoveRight', newX)
    }

    const rotate = () => {
        if (!isPlayerActive()) return
        const playerStack = sd.game.getPlayerStack(sd.playerId)
        const playerCurrentPiece = sd.game.getPlayerPieces(sd.playerId)[0]
        if (playerCurrentPiece.rotate(playerStack)) {
            const newPoints = playerCurrentPiece.getPoints()
            io.to(socket.id).emit('newPoints', newPoints)
        }
    }

    const createdMessage = (msg: Message) => {
        socket.to(sd.roomName).emit('newIncomingMsg', msg)
        deps.messageStore.saveMessage(sd.roomName, msg)
    }

    const onDisconnect = async () => {
        const otherSocket = await getOtherSocket()
        if (otherSocket) {
            setGameHostToSocket(otherSocket)
        }

        sd.game.removePlayer(sd.playerId)

        deps.sessionStore.saveSession(sd.sessionId, {
            playerId: sd.playerId,
            playerName: sd.playerName,
            roomName: sd.roomName,
            playerState: sd.playerState
        });

        const sockets = await io.in(sd.roomName).fetchSockets()
        if (sockets.length === 0) {
            deps.cleanStores(sd.roomName)
        }
    }

    const quitGame = async () => {
        io.to(socket.id).emit('resetGame')
        sd.playerState.playState = PlayState.WAITING

        const sockets = await io.in(sd.roomName).fetchSockets()
        for (const sock of sockets) {
            if (sock.id === socket.id) {
                io.to(sock.id).emit('newState', { playerState: sd.playerState })
            } else {
                io.to(sock.id).emit('newState', { otherPlayerState: sd.playerState })
            }
        }
    }

    const getOtherSocket = async () => {
        const sockets = await io.in(sd.roomName).fetchSockets()
        for (const sock of sockets) {
            if (sock.id !== socket.id) {
                return sock
            }
        }
    }

    const safe = (handler: (...args: any[]) => any) => {
        return (...args: any[]) => {
            try {
                const result = handler(...args)
                if (result && typeof result.catch === 'function') {
                    return result.catch((err: unknown) => {
                        console.error(`[${sd.roomName}] Socket handler error:`, err)
                    })
                }
                return result
            } catch (err) {
                console.error(`[${sd.roomName}] Socket handler error:`, err)
            }
        }
    }

    socket.on('setReady', safe(setReady))
    socket.on('startGame', safe(startGame))

    socket.on('moveDown', safe(moveDown))
    socket.on('moveLeft', safe(moveLeft))
    socket.on('moveRight', safe(moveRight))
    socket.on('rotate', safe(rotate))

    socket.on('disconnect', safe(onDisconnect))
    socket.on('quitGame', safe(quitGame))

    socket.on('createdMessage', safe(createdMessage))
}

export default GameHandler