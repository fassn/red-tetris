import { MAX_PLAYERS, SPACING, TILEWIDTH } from "../shared/config"
import InMemoryMessageStore from "./stores/message-store"
import InMemorySessionStore from "./stores/session-store"
import Player from "./player"
import { GameMode, PlayerState, PlayState, RoomPlayer, Message } from "../shared/types"
import type { TypedServer, TypedSocket, TypedRemoteSocket } from "./io-types"
import { emitEndGameToPlayers } from "./gameloop"

export type GameDeps = {
    sessionStore: InMemorySessionStore
    messageStore: InMemoryMessageStore
    cleanStores: (roomName: string) => void
}

/** Build a RoomPlayer summary from a remote socket */
function toRoomPlayer(sock: TypedSocket | TypedRemoteSocket): RoomPlayer {
    return {
        playerId: sock.data.playerId,
        playerName: sock.data.playerName,
        state: sock.data.playerState,
    }
}

const GameHandler = async (io: TypedServer, socket: TypedSocket, deps: GameDeps) => {
    const sd = socket.data

    // Join room upon connection
    const allSockets = await io.in(sd.roomName).fetchSockets()

    if (allSockets.length >= MAX_PLAYERS) {
        io.to(socket.id).emit('roomIsFull')
        socket.disconnect()
        return
    }

    socket.join(sd.roomName)
    socket.emit('session', { sessionId: sd.sessionId, playerId: sd.playerId })
    socket.emit('messages', sd.messages)

    /** Broadcast playerState + otherPlayers + gameMode to every socket in the room */
    const broadcastRoomState = async () => {
        const sockets = await io.in(sd.roomName).fetchSockets()
        for (const sock of sockets) {
            const otherPlayers = sockets
                .filter((s) => s.id !== sock.id)
                .map(toRoomPlayer)
            io.to(sock.id).emit('newState', {
                playerState: sock.data.playerState,
                otherPlayers,
                gameMode: sd.game.gameMode,
            })
        }
    }

    const assignHost = async () => {
        const sockets = await io.in(sd.roomName).fetchSockets()
        if (sockets.length === 0) return

        // First socket in the room becomes host
        for (const sock of sockets) {
            sock.data.playerState.host = sock.id === sockets[0].id
        }
        await broadcastRoomState()
    }

    await assignHost()

    const startGame = async () => {
        sd.game.isStarted = true
        sd.game.startTimer()
        addPlayer()

        // Transition all eligible players to PLAYING
        for (const player of sd.game.players) {
            const ps = player.socket.data.playerState
            if (ps.host || ps.playState === PlayState.READY) {
                ps.playState = PlayState.PLAYING
            }
            io.to(player.socket.id).emit('newGame', {
                newStack: player.stack,
                firstPiece: sd.game.getPieceProps(player.pieces[0]),
                secondPiece: sd.game.getPieceProps(player.pieces[1])
            })
        }

        await broadcastRoomState()
    }

    const setReady = async (isReady: boolean) => {
        if (isReady) {
            addPlayer()
            sd.playerState.playState = PlayState.READY
        } else {
            sd.game.removePlayer(sd.playerId)
            sd.playerState.playState = PlayState.WAITING
        }
        await broadcastRoomState()
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
        const playerPieces = sd.game.getPlayerPieces(sd.playerId)
        if (!playerStack || !playerPieces?.[0]) return
        playerPieces[0].down(playerStack)
        const newY = playerPieces[0].getY()
        io.to(socket.id).emit('newMoveDown', newY)
    }

    const moveLeft = () => {
        if (!isPlayerActive()) return
        const playerStack = sd.game.getPlayerStack(sd.playerId)
        const playerPieces = sd.game.getPlayerPieces(sd.playerId)
        if (!playerStack || !playerPieces?.[0]) return
        playerPieces[0].setX(playerPieces[0].getX() - TILEWIDTH - SPACING, playerStack)
        const newX = playerPieces[0].getX()
        io.to(socket.id).emit('newMoveLeft', newX)
    }

    const moveRight = () => {
        if (!isPlayerActive()) return
        const playerStack = sd.game.getPlayerStack(sd.playerId)
        const playerPieces = sd.game.getPlayerPieces(sd.playerId)
        if (!playerStack || !playerPieces?.[0]) return
        playerPieces[0].setX(playerPieces[0].getX() + TILEWIDTH + SPACING, playerStack)
        const newX = playerPieces[0].getX()
        io.to(socket.id).emit('newMoveRight', newX)
    }

    const rotate = () => {
        if (!isPlayerActive()) return
        const playerStack = sd.game.getPlayerStack(sd.playerId)
        const playerPieces = sd.game.getPlayerPieces(sd.playerId)
        if (!playerStack || !playerPieces?.[0]) return
        if (playerPieces[0].rotate(playerStack)) {
            const newPoints = playerPieces[0].getPoints()
            io.to(socket.id).emit('newPoints', newPoints)
        }
    }

    const createdMessage = (msg: Message) => {
        socket.to(sd.roomName).emit('newIncomingMsg', msg)
        deps.messageStore.saveMessage(sd.roomName, msg)
    }

    const setGameMode = async (mode: GameMode) => {
        if (!sd.playerState.host) return
        if (sd.game.isStarted) return
        sd.game.gameMode = mode
        const sockets = await io.in(sd.roomName).fetchSockets()
        for (const sock of sockets) {
            io.to(sock.id).emit('gameModeChanged', { gameMode: mode })
        }
    }

    const onDisconnect = async () => {
        sd.game.removePlayer(sd.playerId)

        deps.sessionStore.saveSession(sd.sessionId, {
            playerId: sd.playerId,
            playerName: sd.playerName,
            roomName: sd.roomName,
            playerState: sd.playerState
        })

        const sockets = await io.in(sd.roomName).fetchSockets()
        if (sockets.length === 0) {
            deps.cleanStores(sd.roomName)
        } else {
            await assignHost()
        }
    }

    const quitGame = async () => {
        if (isPlayerActive()) {
            const player = sd.game.players.find((p: Player) => p.id === sd.playerId)
            if (player) {
                player.forfeited = true
                emitEndGameToPlayers(io, player, sd.game)
            }
        }
        io.to(socket.id).emit('resetGame')
        sd.playerState.playState = PlayState.WAITING
        await broadcastRoomState()
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
    socket.on('setGameMode', safe(setGameMode))

    socket.on('moveDown', safe(moveDown))
    socket.on('moveLeft', safe(moveLeft))
    socket.on('moveRight', safe(moveRight))
    socket.on('rotate', safe(rotate))

    socket.on('disconnect', safe(onDisconnect))
    socket.on('quitGame', safe(quitGame))

    socket.on('createdMessage', safe(createdMessage))
}

export default GameHandler