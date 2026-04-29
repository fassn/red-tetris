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

const COUNTDOWN_DELAY = Number(process.env.COUNTDOWN_DELAY_MS ?? 333)

export type GameDeps = {
    sessionStore: InMemorySessionStore
    messageStore: InMemoryMessageStore
    cleanStores: (roomName: string) => void
}

/**
 * Per-room join lock to prevent TOCTOU race between fetchSockets() and
 * socket.join(). Without this, two sockets arriving simultaneously could
 * both pass the MAX_PLAYERS check before either has joined.
 */
const roomJoinLocks = new Map<string, Promise<void>>()

async function withJoinLock<T>(roomName: string, fn: () => Promise<T>): Promise<T> {
    const prev = roomJoinLocks.get(roomName) ?? Promise.resolve()
    let release!: () => void
    const lock = new Promise<void>(r => { release = r })
    roomJoinLocks.set(roomName, lock)
    await prev
    try {
        return await fn()
    } finally {
        release()
        if (roomJoinLocks.get(roomName) === lock) {
            roomJoinLocks.delete(roomName)
        }
    }
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

    // Join room upon connection — serialised per-room to prevent TOCTOU race
    const joined = await withJoinLock(sd.roomName, async () => {
        const allSockets = await io.in(sd.roomName).fetchSockets()
        if (allSockets.length >= MAX_PLAYERS) {
            io.to(socket.id).emit('roomIsFull')
            socket.disconnect()
            return false
        }
        socket.join(sd.roomName)
        return true
    })
    if (!joined) return
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
                isPaused: sd.game.isPaused,
            })
        }
    }

    const assignHost = async () => {
        const sockets = await io.in(sd.roomName).fetchSockets()
        if (sockets.length === 0) return

        // Keep existing host if still connected
        const currentHost = sockets.find(s => s.data.playerState?.host)
        const hostId = currentHost ? currentHost.id : sockets[0].id
        for (const sock of sockets) {
            if (sock.data.playerState) {
                sock.data.playerState.host = sock.id === hostId
            }
        }
        await broadcastRoomState()
    }

    await assignHost()

    // Push current board states so spectators joining mid-game see boards immediately
    if (sd.game.isStarted) {
        for (const player of sd.game.players) {
            if (player.id !== sd.playerId && player.socket.data.playerState.playState === PlayState.PLAYING) {
                socket.emit('opponentStack', {
                    playerId: player.id,
                    playerName: player.name,
                    stack: player.stack,
                })
            }
        }
    }

    const startGame = async () => {
        if (!sd.playerState.host) return
        if (sd.game.isStarted || sd.game.isCountingDown) return

        const token = sd.game.startCountdown()
        try {
            for (const count of [3, 2, 1]) {
                io.to(sd.roomName).emit('gameCountdown', { count })
                await new Promise<void>(r => setTimeout(r, COUNTDOWN_DELAY))
                if (!sd.game.isCountdownValid(token)) {
                    io.to(sd.roomName).emit('gameCountdown', { count: -1 })
                    return
                }
            }

            sd.game.isStarted = true
            sd.game.startTimer()
            addPlayer()
            sd.game.startedPlayerCount = sd.game.players.length

            // Clear last scores for all sockets in the room (including spectators)
            const allRoomSockets = await io.in(sd.roomName).fetchSockets()
            for (const sock of allRoomSockets) {
                if (sock.data.playerState) {
                    sock.data.playerState.lastScore = null
                    sock.data.playerState.lastLines = null
                }
            }

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
                    secondPiece: sd.game.getPieceProps(player.pieces[1]),
                    startedPlayerCount: sd.game.startedPlayerCount,
                })
            }

            // count=0 tells non-playing observers to clear their countdown overlay
            io.to(sd.roomName).emit('gameCountdown', { count: 0 })
            await broadcastRoomState()
        } finally {
            sd.game.isCountingDown = false
        }
    }

    const setReady = async (isReady: boolean) => {
        if (sd.game.isStarted || sd.game.isCountingDown) return
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
        if (sd.game.isPaused) return
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
        if (sd.game.isPaused) return
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
        if (sd.game.isPaused) return
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
        if (sd.game.isPaused) return
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

    const pauseGame = async () => {
        if (!isPlayerActive()) return
        if (sd.game.startedPlayerCount > 1) return
        if (isRateLimited(sd.playerId, 'move')) return
        sd.game.isPaused = !sd.game.isPaused
        if (sd.game.isPaused) {
            io.to(sd.roomName).emit('gamePaused')
        } else {
            io.to(sd.roomName).emit('gameResumed')
        }
        await broadcastRoomState()
    }

    const setGameMode = async (mode: GameMode) => {
        if (!sd.playerState.host) return
        if (sd.game.isStarted || sd.game.isCountingDown) return
        if (!isValidGameMode(mode)) return
        if (isRateLimited(sd.playerId, 'mode')) return
        sd.game.gameMode = mode
        const sockets = await io.in(sd.roomName).fetchSockets()
        for (const sock of sockets) {
            io.to(sock.id).emit('gameModeChanged', { gameMode: mode })
        }
    }

    const onDisconnect = async () => {
        // Cancel any active countdown so the async startGame loop aborts cleanly
        if (sd.game.isCountingDown) {
            sd.game.cancelCountdown()
        }

        // If the player was actively playing, treat disconnect as forfeit
        if (isPlayerActive()) {
            const player = sd.game.players.find((p: Player) => p.id === sd.playerId)
            if (player) {
                player.forfeited = true
                emitEndGameToPlayers(io, player, sd.game)
            }
        }

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

    const safe = (name: string, handler: (...args: any[]) => any) => {
        return (...args: any[]) => {
            try {
                const result = handler(...args)
                if (result && typeof result.catch === 'function') {
                    return result.catch((err: unknown) => {
                        roomLog.error(`[${name}] handler error:`, err)
                    })
                }
                return result
            } catch (err) {
                roomLog.error(`[${name}] handler error:`, err)
            }
        }
    }

    socket.on('setReady', safe('setReady', setReady))
    socket.on('startGame', safe('startGame', startGame))
    socket.on('setGameMode', safe('setGameMode', setGameMode))
    socket.on('pauseGame', safe('pauseGame', pauseGame))

    socket.on('moveDown', safe('moveDown', moveDown))
    socket.on('moveLeft', safe('moveLeft', moveLeft))
    socket.on('moveRight', safe('moveRight', moveRight))
    socket.on('rotate', safe('rotate', rotate))

    socket.on('disconnect', safe('disconnect', onDisconnect))
    socket.on('quitGame', safe('quitGame', quitGame))

    socket.on('createdMessage', safe('createdMessage', createdMessage))
}

export default GameHandler