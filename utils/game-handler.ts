import { Server, Socket } from "socket.io"
import { PieceType, RGB } from "./game-client"

const GameHandler = (io: Server, socket: Socket) => {
    const createdMessage = (msg: string) => {
        socket.broadcast.emit('newIncomingMsg', msg)
    }

    const fetchNewPiece = () => {
        const types: PieceType[] = ['bar', 'left_L', 'right_L', 'cube', 'T', 'Z', 'rev_Z']
        const type: PieceType = types[Math.floor(Math.random() * types.length)]

        const colors: RGB[] = [[255, 0, 0], [0, 255, 0], [0, 0, 255]]
        const color: RGB = colors[Math.floor(Math.random() * colors.length)]

        socket.emit('newIncomingPiece', {type, color})
    }

    socket.on('createdMessage', createdMessage)

    socket.on('fetchNewPiece', fetchNewPiece)
}

export default GameHandler