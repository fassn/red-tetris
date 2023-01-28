import type { Server as HTTPServer } from 'http'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Socket as NetSocket } from 'net'
import type { Server as IOServer, Socket } from 'socket.io'
import * as crypto from 'crypto'

import { Server } from 'socket.io'
import GameHandler from "../../utils/game-handler";
import InMemorySessionStore, { Session } from '../../utils/session-store'
import InMemoryMessageStore from '../../utils/message-store'
import InMemoryGameStore from '../../utils/game-store'
import { FRAMERATE, SPACING, TILEHEIGHT } from '../../utils/config'
import { Piece } from '../../utils/game'

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
        console.log('Already set up')
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
        socket.data.messages = messageStore.findMessagesForRoom(roomName)
        const game = gameStore.findGame(roomName)
        if (game) {
            socket.data.game = game
        } else {
            socket.data.game = gameStore.create(roomName, io, [])
        }
        socket.data.sessionId = randomId();
        socket.data.playerId = randomId();
        socket.data.roomName = roomName
        socket.data.playerName = playerName
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
                try {
                    const game = gameStore.findGame(room)
                    if (game && game.isStarted) {
                        for (const player of game.players) {
                            const playerStack = game.getPlayerStack(player.id)
                            const playerPieces = game.getPlayerPieces(player.id)
                            /* On every new frame */
                            if (frameCount % FRAMERATE === 0) {
                                const currentPiece = playerPieces[0]

                                /* Incrementally change the y position down */
                                const newY = currentPiece.getY() + (TILEHEIGHT + SPACING)
                                io.to(player.socketId).emit('newPosition', newY)

                                 /* Effectively moves the tetrimino if active && has not hit anything down */
                                currentPiece.setY(newY, playerStack)

                                /* If the tetrimino has hit something down */
                                if (!currentPiece.isActive() && !currentPiece.isDisabled()) {

                                    /* The tetrimino has hit down && is at the top row */
                                    if (currentPiece.getY() === 0) {

                                        /* Send to other players the good news */
                                        for (const otherPlayer of game.players) {
                                            if (otherPlayer.id !== player.id) {
                                                io.to(otherPlayer.socketId).emit('gameWon')
                                            }
                                        }
                                        /* Send the bad news to the current player */
                                        io.to(player.socketId).emit('gameLost')
                                        game.reset()
                                    }

                                    /* Add the tetrimino to the stack */
                                    currentPiece.disable()
                                    game.addToStack(currentPiece, playerStack)

                                    /* Increase score upon filled lines */
                                    const lineCount = game.countFilledLines(playerStack)
                                    const score = game.addToScore(lineCount, player.id)

                                    /* Update the stack and score */
                                    io.to(player.socketId).emit('newStack', { newStack: playerStack, newScore: score })

                                    /* Get the next tetrimino */
                                    playerPieces.shift()
                                    if (playerPieces.length === 1) {
                                        const randomProps = game.getRandomPieceProps()
                                        for (const player of game.players) {
                                            player.pieces.push(new Piece(randomProps))
                                        }
                                    }

                                    /* Update the tetriminos */
                                    const newCurrentPiece = game.getPieceProps(playerPieces[0])
                                    const newNextPiece = game.getPieceProps(playerPieces[1])
                                    io.to(player.socketId).emit('newPiece', { newCurrentPiece, newNextPiece })
                                }
                            }
                        }
                    }
                } catch (e) {
                    continue
                }
            }
            frameCount++
            loop()
        }, 1000 / FRAMERATE)
    }
    loop()


    console.log('Setting up socket.')
    res.end()
}