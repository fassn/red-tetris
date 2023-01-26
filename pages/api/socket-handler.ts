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
                const game = gameStore.createOrFindGame(session.roomName, io, [])
                socket.data.sessionId = sessionId
                socket.data.userId = session.userId
                socket.data.roomName = session.roomName
                socket.data.playerName = session.playerName
                socket.data.messages = messages
                socket.data.game = game
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
        socket.data.game = gameStore.createOrFindGame(roomName, io, [])
        socket.data.sessionId = randomId();
        socket.data.userId = randomId();
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

    console.log('Setting up socket.')
    res.end()
}