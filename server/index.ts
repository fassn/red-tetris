import { createServer } from 'http'
import next from 'next'
import { Server } from 'socket.io'
import * as crypto from 'crypto'

import GameHandler from './game-handler'
import InMemorySessionStore, { Session } from './stores/session-store'
import InMemoryMessageStore from './stores/message-store'
import InMemoryGameStore from './stores/game-store'
import { FRAMERATE } from '../shared/config'
import { PlayState } from '../shared/types'
import type { ClientToServerEvents, ServerToClientEvents } from '../shared/socket-events'
import type { SocketData } from './io-types'
import {
    broadcastOpponentStack,
    checkIfPieceHasHit,
    emitEndGameToPlayers,
    emitNextPiece,
    emitStackAndScore,
    movePieceDown,
    updatePiecesStack,
} from './gameloop'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOST || '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

const sessionStore = new InMemorySessionStore()
const messageStore = new InMemoryMessageStore()
const gameStore = new InMemoryGameStore()

const randomId = (): string => crypto.randomBytes(8).toString('hex')

const cleanStores = (roomName: string) => {
    sessionStore.removeSessionsFromRoom(roomName)
    messageStore.removeMessagesFromRoom(roomName)
    gameStore.removeGameFromRoom(roomName)
}

app.prepare().then(() => {
    const httpServer = createServer(handle)
    const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer)

    // Session recovery middleware
    io.use((socket, next) => {
        const sessionId = socket.handshake.auth.sessionId
        if (sessionId) {
            const session: Session | undefined = sessionStore.findSession(sessionId)
            if (session) {
                socket.data.sessionId = sessionId
                socket.data.playerId = session.playerId
                socket.data.roomName = session.roomName
                socket.data.playerName = session.playerName
                socket.data.playerState = session.playerState
                socket.data.messages = messageStore.findMessagesForRoom(session.roomName)
                socket.data.game = gameStore.findGame(session.roomName) ?? gameStore.create(session.roomName, io, [])
                return next()
            }
        }

        const playerName = socket.handshake.auth.playerName
        const roomName = socket.handshake.auth.roomName
        if (!roomName) return next(new Error('invalid room name'))
        if (!playerName) return next(new Error('invalid player name'))

        socket.data.sessionId = randomId()
        socket.data.playerId = randomId()
        socket.data.roomName = roomName
        socket.data.playerName = playerName
        socket.data.playerState = { host: false, playState: PlayState.WAITING }
        socket.data.messages = messageStore.findMessagesForRoom(roomName)
        const game = gameStore.findGame(roomName)
        socket.data.game = game ?? gameStore.create(roomName, io, [])

        next()
    })

    io.on('connection', (socket) => {
        GameHandler(io, socket, { sessionStore, messageStore, cleanStores })
    })

    // Game loop — each game tracks its own tick count and drop interval
    const loop = () => {
        setTimeout(() => {
            try {
                for (const [, game] of gameStore.games) {
                    if (!game.isStarted) continue
                    const shouldDrop = game.tick()

                    for (const player of game.players) {
                        if (player.socket.data.playerState.playState !== PlayState.PLAYING) continue
                        if (!shouldDrop) continue

                        const playerStack = player.stack
                        const playerPieces = player.pieces
                        const currentPiece = playerPieces[0]

                        movePieceDown(io, currentPiece, player, playerStack)

                        if (checkIfPieceHasHit(currentPiece)) {
                            if (currentPiece.getY() === 0) {
                                emitEndGameToPlayers(io, player, game)
                                break
                            }

                            game.addToStack(currentPiece, playerStack)
                            emitStackAndScore(io, game, player, playerStack)
                            broadcastOpponentStack(io, game, player)
                            updatePiecesStack(playerPieces, game)
                            emitNextPiece(io, game, player, playerPieces)
                        }
                    }
                }
            } catch (err) {
                console.error('Game loop error:', err)
            }

            loop()
        }, 1000 / FRAMERATE)
    }
    loop()

    httpServer.listen(port, () => {
        console.log(`> Server listening on http://${hostname}:${port}`)
    })
})
