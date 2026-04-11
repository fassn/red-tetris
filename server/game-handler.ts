/**
 * Socket event handlers for game rooms.
 *
 * **Mutation model:**
 * Node.js is single-threaded — socket handlers and the game loop (setInterval)
 * never execute concurrently. Handlers mutate player piece position (moveLeft,
 * moveRight, rotate, moveDown) and game mode. The game loop (server/index.ts)
 * drives gravity (auto-drop), line clearing, scoring, and game-over detection.
 * Both paths share Game state safely because only one runs at a time on the
 * event loop.
 */

import { MAX_PLAYERS, SPACING, TILEWIDTH } from "../shared/config"
import InMemoryMessageStore from "./stores/message-store"
import InMemorySessionStore from "./stores/session-store"
import Player from "./player"
import { GameMode, PlayerState, PlayState, RoomPlayer, Message } from "../shared/types"
import type { TypedServer, TypedSocket, TypedRemoteSocket } from "./io-types"
import { emitEndGameToPlayers } from "./gameloop"
import { isValidGameMode, isValidMessage } from "./validation"
import { isRateLimited } from "./rate-limiter"
import { createLogger } from "./logger"

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
    const roomLog = createLogger(sd.roomName)

    // On reconnect, disconnect any stale socket for the same player
    if (sd.isReconnect) {
        const allSockets = await io.in(sd.roomName).fetchSockets()
        for (const old of allSockets) {
            if (old.data.playerId === sd.playerId && old.id !== socket.id) {
                old.disconnect(true)
            }
        }
    }

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
        if (!sd.playerState.host) return
        if (sd.game.isStarted) return
        sd.game.isStarted = true
        sd.game.startTimer()
        addPlayer()

        // Transition all eligible players to PLAYING
        for (const player of sd.game.players) {
            if (!player.pieces[0] || !player.pieces[1]) continue
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
        if (!isReady && sd.game.isStarted) return
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
        if (isRateLimited(sd.playerId, 'move')) return
        const playerStack = sd.game.getPlayerStack(sd.playerId)
        const playerPieces = sd.game.getPlayerPieces(sd.playerId)
        if (!playerStack || !playerPieces?.[0]) return
        playerPieces[0].down(playerStack)
        const newY = playerPieces[0].getY()
        io.to(socket.id).emit('newMoveDown', newY)
    }

    const moveLeft = () => {
        if (!isPlayerActive()) return
        if (isRateLimited(sd.playerId, 'move')) return
        const playerStack = sd.game.getPlayerStack(sd.playerId)
        const playerPieces = sd.game.getPlayerPieces(sd.playerId)
        if (!playerStack || !playerPieces?.[0]) return
        playerPieces[0].setX(playerPieces[0].getX() - TILEWIDTH - SPACING, playerStack)
        const newX = playerPieces[0].getX()
        io.to(socket.id).emit('newMoveLeft', newX)
    }

    const moveRight = () => {
        if (!isPlayerActive()) return
        if (isRateLimited(sd.playerId, 'move')) return
        const playerStack = sd.game.getPlayerStack(sd.playerId)
        const playerPieces = sd.game.getPlayerPieces(sd.playerId)
        if (!playerStack || !playerPieces?.[0]) return
        playerPieces[0].setX(playerPieces[0].getX() + TILEWIDTH + SPACING, playerStack)
        const newX = playerPieces[0].getX()
        io.to(socket.id).emit('newMoveRight', newX)
    }

    const rotate = () => {
        if (!isPlayerActive()) return
        if (isRateLimited(sd.playerId, 'move')) return
        const playerStack = sd.game.getPlayerStack(sd.playerId)
        const playerPieces = sd.game.getPlayerPieces(sd.playerId)
        if (!playerStack || !playerPieces?.[0]) return
        if (playerPieces[0].rotate(playerStack)) {
            const newPoints = playerPieces[0].getPoints()
            io.to(socket.id).emit('newPoints', newPoints)
        }
    }

    const createdMessage = (msg: Message) => {
        if (!isValidMessage(msg?.message)) return
        if (isRateLimited(sd.playerId, 'chat')) return
        const sanitized: Message = {
            author: sd.playerName,
            message: msg.message.slice(0, 500),
        }
        socket.to(sd.roomName).emit('newIncomingMsg', sanitized)
        deps.messageStore.saveMessage(sd.roomName, sanitized)
    }

    const setGameMode = async (mode: GameMode) => {
        if (!sd.playerState.host) return
        if (sd.game.isStarted) return
        if (!isValidGameMode(mode)) return
        if (isRateLimited(sd.playerId, 'mode')) return
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
                        roomLog.error('Socket handler error:', err)
                    })
                }
                return result
            } catch (err) {
                roomLog.error('Socket handler error:', err)
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