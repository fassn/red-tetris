import type { Server as HTTPServer } from 'http'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Socket as NetSocket } from 'net'
import type { Server as IOServer, Socket } from 'socket.io'
import * as crypto from 'crypto'

import { Server } from 'socket.io'
import GameHandler from "../../utils/game-handler";
import InMemorySessionStore, { Session } from '../../utils/stores/session-store'
import InMemoryMessageStore from '../../utils/stores/message-store'
import InMemoryGameStore from '../../utils/stores/game-store'
import { FRAMERATE } from '../../utils/config'
import Player from '../../utils/player'
import { PlayState } from '../../utils/types'
import { checkIfPieceHasHit, emitEndGameToPlayers, emitNextPiece, emitStackAndScore, movePieceDown, updatePiecesStack } from '../../utils/gameloop'

interface SocketServer extends HTTPServer {
    io?: IOServer | undefined
}

interface SocketWithIO extends NetSocket {
    server: SocketServer
}

interface NextApiResponseWithSocket extends NextApiResponse {
    socket: SocketWithIO
}

export let sessionStore: InMemorySessionStore
export let messageStore: InMemoryMessageStore
export let gameStore: InMemoryGameStore

export let cleanStores: (roomName: string) => void

export default function SocketHandler(
    _: NextApiRequest,
    res: NextApiResponseWithSocket
) {
    if (res.socket.server.io) {
        console.info('Already set up')
        res.end()
        return
    }

    const io = new Server(res.socket.server)
    res.socket.server.io = io

    sessionStore = new InMemorySessionStore()
    messageStore = new InMemoryMessageStore()
    gameStore = new InMemoryGameStore()
    const randomId = (): string => crypto.randomBytes(8).toString("hex");
    io.use((socket: Socket, next) => {
        // find an existing session
        const sessionId = socket.handshake.auth.sessionId
        if (sessionId) {
            const session: Session | undefined = sessionStore.findSession(sessionId)
            if (session) {
                const messages = messageStore.findMessagesForRoom(session.roomName)
                socket.data.sessionId = sessionId
                socket.data.playerId = session.playerId
                socket.data.roomName = session.roomName
                socket.data.playerName = session.playerName
                socket.data.playerState = session.playerState
                socket.data.messages = messages
                socket.data.game = gameStore.findGame(session.roomName)
                return next()
            }
        }

        const playerName = socket.handshake.auth.playerName;
        const roomName = socket.handshake.auth.roomName
        if (!roomName) {
            return next(new Error('invalid room name'))
        }
        if (!playerName) {
            return next(new Error("invalid player name"))
        }

        // create a new session
        socket.data.sessionId = randomId();
        socket.data.playerId = randomId();
        socket.data.roomName = roomName
        socket.data.playerName = playerName
        socket.data.playerState = { host: false, playState: PlayState.WAITING }
        socket.data.messages = messageStore.findMessagesForRoom(roomName)
        const game = gameStore.findGame(roomName)
        if (game) {
            socket.data.game = game
        } else {
            socket.data.game = gameStore.create(roomName, io, [])
        }
        next();
    });

    const onConnection = (socket: Socket) => {
        GameHandler(io, socket)
    }

    cleanStores = (roomName: string) => {
        sessionStore.removeSessionsFromRoom(roomName)
        messageStore.removeMessagesFromRoom(roomName)
        gameStore.removeGameFromRoom(roomName)
    }

    const getOtherPlayer = (player: Player, players: Player[]): Player | undefined => {
        if (players.length === 1) {
            return
        }

        let otherPlayer
        players.forEach((p, i) => {
            if (p.id === player.id) {
                if (i === 0) otherPlayer = players[1]
                if (i === 1) otherPlayer = players[0]
            }
        })
        return otherPlayer
    }

    io.on('connection', onConnection)

    let frameCount = 0
    const loop = () => {
        setTimeout(async () => {
            let roomsArray = []
            const sockets = await io.fetchSockets()
            for (const socket of sockets) {
                roomsArray.push(socket.data.roomName)
            }
            const rooms = new Set(roomsArray)
            for (const room of rooms) {
                const game = gameStore.findGame(room)
                if (game && game.isStarted) {
                    for (const player of game.players) {
                        const otherPlayer = getOtherPlayer(player, game.players)
                        const playerStack = player.stack
                        const playerPieces = player.pieces

                        /* On every new frame */
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
            }
            frameCount++
            loop()
        }, 1000 / FRAMERATE)
    }
    loop()


    console.info('Setting up socket.')
    res.end()
}