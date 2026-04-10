import { createServer } from 'http'
import next from 'next'
import { Server, Socket } from 'socket.io'
import * as crypto from 'crypto'

import GameHandler from './utils/game-handler'
import InMemorySessionStore, { Session } from './utils/stores/session-store'
import InMemoryMessageStore from './utils/stores/message-store'
import InMemoryGameStore from './utils/stores/game-store'
import { FRAMERATE } from './utils/config'
import Player from './utils/player'
import { PlayState } from './utils/types'
import {
    checkIfPieceHasHit,
    emitEndGameToPlayers,
    emitNextPiece,
    emitStackAndScore,
    movePieceDown,
    updatePiecesStack,
} from './utils/gameloop'

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

const getOtherPlayer = (player: Player, players: Player[]): Player | undefined => {
    if (players.length === 1) return undefined
    return players.find((p) => p.id !== player.id)
}

app.prepare().then(() => {
    const httpServer = createServer(handle)
    const io = new Server(httpServer)

    // Session recovery middleware
    io.use((socket: Socket, next) => {
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
                socket.data.game = gameStore.findGame(session.roomName)
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

    io.on('connection', (socket: Socket) => {
        GameHandler(io, socket, { sessionStore, messageStore, cleanStores })
    })

    // Game loop
    let frameCount = 0
    const loop = () => {
        setTimeout(async () => {
            try {
                const sockets = await io.fetchSockets()
                const rooms = new Set(sockets.map((s) => s.data.roomName))

                for (const room of rooms) {
                    const game = gameStore.findGame(room)
                    if (!game?.isStarted) continue

                    for (const player of game.players) {
                        const otherPlayer = getOtherPlayer(player, game.players)
                        const playerStack = player.stack
                        const playerPieces = player.pieces

                        if (frameCount % FRAMERATE === 0) {
                            const currentPiece = playerPieces[0]

                            movePieceDown(io, currentPiece, player, playerStack)

                            if (checkIfPieceHasHit(currentPiece)) {
                                if (currentPiece.getY() === 0) {
                                    emitEndGameToPlayers(io, player, otherPlayer)
                                    game.reset()
                                    break
                                }

                                game.addToStack(currentPiece, playerStack)
                                emitStackAndScore(io, game, player, playerStack)
                                updatePiecesStack(playerPieces, game)
                                emitNextPiece(io, game, player, playerPieces)
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Game loop error:', err)
            }

            frameCount++
            loop()
        }, 1000 / FRAMERATE)
    }
    loop()

    httpServer.listen(port, () => {
        console.log(`> Server listening on http://${hostname}:${port}`)
    })
})
