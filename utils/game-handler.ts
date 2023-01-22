import { Server, Socket } from "socket.io"

const GameHandler = (io: Server, socket: Socket) => {
    const createdMessage = (msg: string) => {
        socket.broadcast.emit('newIncomingMsg', msg)
    }

    socket.on('createdMessage', createdMessage)
}

export default GameHandler