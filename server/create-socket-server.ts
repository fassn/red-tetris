import { Server } from 'socket.io'
import * as crypto from 'crypto'
import type { Server as HttpServer } from 'http'

import GameHandler from './game-handler'
import InMemorySessionStore, { Session } from './stores/session-store'
import InMemoryMessageStore from './stores/message-store'
import InMemoryGameStore from './stores/game-store'
import { PlayState } from '../shared/types'
import type { ClientToServerEvents, ServerToClientEvents } from '../shared/socket-events'
import type { SocketData } from './io-types'
import { isValidName } from './validation'

const randomId = (): string => crypto.randomBytes(8).toString('hex')

export type SocketServerDeps = {
    sessionStore: InMemorySessionStore
    messageStore: InMemoryMessageStore
    gameStore: InMemoryGameStore
}

export type SocketServerOptions = {
    cors?: { origin: string }
}

/**
 * Create and configure a Socket.IO server with session middleware and game handlers.
 * Separated from server/index.ts for testability.
 */
export function createSocketServer(httpServer: HttpServer, deps: SocketServerDeps, opts?: SocketServerOptions) {
    const { sessionStore, messageStore, gameStore } = deps

    const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
        ...(opts?.cors && { cors: opts.cors }),
    })

    const cleanStores = (roomName: string) => {
        sessionStore.removeSessionsFromRoom(roomName)
        messageStore.removeMessagesFromRoom(roomName)
        gameStore.removeGameFromRoom(roomName)
    }

    // Session recovery middleware
    io.use((socket, next) => {
        const sessionId = socket.handshake.auth.sessionId
        const requestedRoom = socket.handshake.auth.roomName
        if (sessionId) {
            const session: Session | undefined = sessionStore.findSession(sessionId)
            // Only recover if the client wants the same room (or didn't specify one)
            if (session && (!requestedRoom || requestedRoom === session.roomName)) {
                const newSessionId = randomId()
                sessionStore.removeSession(sessionId)
                socket.data.sessionId = newSessionId
                socket.data.playerId = session.playerId
                socket.data.roomName = session.roomName
                socket.data.playerName = session.playerName
                socket.data.messages = messageStore.findMessagesForRoom(session.roomName)
                const existingGame = gameStore.findGame(session.roomName)
                socket.data.game = existingGame ?? gameStore.create(session.roomName, io, [])
                // If the game was GC'd, reset stale playerState to WAITING
                if (existingGame) {
                    socket.data.playerState = session.playerState
                } else {
                    socket.data.playerState = { host: false, playState: PlayState.WAITING }
                }
                socket.data.isReconnect = true
                return next()
            }
        }

        const playerName = socket.handshake.auth.playerName
        const roomName = socket.handshake.auth.roomName
        if (!isValidName(roomName)) return next(new Error('invalid room name'))
        if (!isValidName(playerName)) return next(new Error('invalid player name'))

        socket.data.sessionId = randomId()
        socket.data.playerId = randomId()
        socket.data.roomName = roomName
        socket.data.playerName = playerName
        socket.data.playerState = { host: false, playState: PlayState.WAITING }
        socket.data.messages = messageStore.findMessagesForRoom(roomName)
        const game = gameStore.findGame(roomName)
        if (!game && gameStore.isFull()) return next(new Error('server is full'))
        socket.data.game = game ?? gameStore.create(roomName, io, [])

        next()
    })

    io.on('connection', (socket) => {
        GameHandler(io, socket, { sessionStore, messageStore, cleanStores })
    })

    return { io, cleanStores }
}
