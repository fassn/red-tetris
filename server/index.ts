import { createServer } from 'http'
import next from 'next'

import InMemorySessionStore from './stores/session-store'
import InMemoryMessageStore from './stores/message-store'
import InMemoryGameStore from './stores/game-store'
import { TICK_RATE } from '../shared/config'
import { PlayState } from '../shared/types'
import { log } from './logger'
import { destroyRateLimiter } from './rate-limiter'
import { closeDb } from './stores/highscore-store'
import { createSocketServer } from './create-socket-server'
import {
    broadcastOpponentStack,
    checkIfPieceHasHit,
    emitEndGameToPlayers,
    emitNextPiece,
    emitStackAndScore,
    emitTimeAttackEnd,
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

app.prepare().then(() => {
    const httpServer = createServer(handle)

    const { io } = createSocketServer(httpServer, { sessionStore, messageStore, gameStore }, {
        ...(process.env.SOCKET_CORS_ORIGIN && {
            cors: { origin: process.env.SOCKET_CORS_ORIGIN },
        }),
    })

    // Game loop — each game tracks its own tick count and drop interval
    const loop = () => {
        setTimeout(() => {
            for (const [roomName, game] of gameStore.games) {
                try {
                    if (!game.isStarted) continue
                    const shouldDrop = game.tick()

                    // Time-attack: emit countdown and check expiry
                    if (game.shouldEmitTimeUpdate()) {
                        const remaining = game.timeRemainingSeconds
                        for (const player of game.players) {
                            io.to(player.socket.id).emit('timeUpdate', { remaining })
                        }
                    }
                    if (game.isTimeExpired) {
                        emitTimeAttackEnd(io, game)
                        continue
                    }

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
                } catch (err) {
                    log.error(`[${roomName}] Game loop error:`, err)
                }
            }

            loop()
        }, 1000 / TICK_RATE)
    }
    loop()

    httpServer.listen(port, () => {
        log.info(`Server listening on http://${hostname}:${port}`)
    })

    // Graceful shutdown
    const shutdown = (signal: string) => {
        log.info(`${signal} received — shutting down gracefully...`)
        destroyRateLimiter()
        sessionStore.destroy()
        try { closeDb() } catch (err) { log.error('Error closing database:', err) }
        io.close(() => {
            log.info('Socket.IO closed')
            httpServer.close(() => {
                log.info('HTTP server closed')
                process.exit(0)
            })
        })
        // Force exit after 10s if graceful shutdown stalls
        setTimeout(() => {
            log.error('Forced shutdown after timeout')
            process.exit(1)
        }, 10_000).unref()
    }
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
})
