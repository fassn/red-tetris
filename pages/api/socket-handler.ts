import type { Server as HTTPServer } from 'http'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Socket as NetSocket } from 'net'
import type { Server as IOServer, Socket } from 'socket.io'

import { Server } from 'socket.io'
import GameHandler from "../../utils/game-handler";

interface SocketServer extends HTTPServer {
    io?: IOServer | undefined
}

interface SocketWithIO extends NetSocket {
    server: SocketServer
}

interface NextApiResponseWithSocket extends NextApiResponse {
    socket: SocketWithIO
}

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

    const onConnection = (socket: Socket) => {
        GameHandler(io, socket)
    }

    io.on('connection', onConnection)

    console.log('Setting up socket.')
    res.end()
}