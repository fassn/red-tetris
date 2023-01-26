import { RemoteSocket, Server, Socket } from "socket.io"
import { DefaultEventsMap } from "socket.io/dist/typed-events"
import { messageStore, sessionStore } from "../pages/api/socket-handler"
import { SPACING, TILEWIDTH } from "./config"
import { Game, Player } from "./game"
import { Message } from "./message-store"

export interface RemoteSocketWithProps extends RemoteSocket<DefaultEventsMap, any> {
    playerName: string
}

const GameHandler = (io: Server, socket: Socket) => {
    // Join room upon connection
    socket.join(socket.data.roomName)
    socket.emit('session', { sessionId: socket.data.sessionId, userId: socket.data.userId })
    socket.emit('messages', socket.data.messages)

    const setReady = (isReady: boolean) => {
        io.to(socket.data.roomName).emit('isOpponentReady', isReady)
    }

    const setGameLeader = async () => {
        const players = []
        const sockets = (await io.in(socket.data.roomName).fetchSockets() as unknown) as RemoteSocketWithProps[]
        if (sockets.length === 1) {
            io.to(socket.data.roomName).emit('setGameLeader', sockets[0].data.playerName)
        }
    }
    setGameLeader()

    const onDisconnect = async () => {
        setGameLeader()

        sessionStore.saveSession(socket.data.sessionId, {
            userId: socket.data.userID,
            playerName: socket.data.playerName,
            roomName: socket.data.roomName
        });
        // messageStore.saveMessage
    }

    const createdMessage = (msg: Message) => {
        socket.to(socket.data.roomName).emit('newIncomingMsg', msg)
        messageStore.saveMessage(socket.data.roomName, msg)
    }

    let game: Game
    let players: Player[] = []
    const initGame = () => {
        game = new Game(io, players)
        socket.game = game
    }

    socket.on('initGame', initGame)

    const startGame = async () => {
        const sockets = (await io.in(socket.data.roomName).fetchSockets() as unknown) as RemoteSocketWithProps[]
        for (const socket of sockets) {
            players.push(new Player(socket.id, socket.data.playerName))
        }

        const firstPiece = game.getPieceProps(game.currentPiece)
        const secondPiece = game.getPieceProps(game.nextPiece)

        io.to(socket.data.roomName).emit('newGame', { newStack: game.stack, firstPiece, secondPiece })
        io.to(socket.data.roomName).emit('joinGame', { newStack: game.stack, firstPiece, secondPiece })
        game.loop(socket.id)
    }

    const moveDown = () => {
        game.currentPiece.down(game.stack)
        const newY = game.currentPiece.getY()
        io.to(socket.id).emit('newMoveDown', newY)
    }
    const moveLeft = () => {
        game.currentPiece.setX(game.currentPiece.getX() - TILEWIDTH - SPACING, game.stack)
        const newX = game.currentPiece.getX()
        io.to(socket.id).emit('newMoveLeft', newX)
    }

    const moveRight = () => {
        game.currentPiece.setX(game.currentPiece.getX() + TILEWIDTH + SPACING, game.stack)
        const newX = game.currentPiece.getX()
        io.to(socket.id).emit('newMoveRight', newX)
    }

    const rotate = () => {
        if (game.currentPiece.rotate(game.stack)) {
            const newPoints = game.currentPiece.getPoints()
            io.to(socket.id).emit('newPoints', newPoints)
        }
    }

    socket.on('createdMessage', createdMessage)

    socket.on('setReady', setReady)

    socket.on('disconnect', onDisconnect)

    socket.on('startGame', startGame)

    socket.on('moveDown', moveDown)
    socket.on('moveLeft', moveLeft)
    socket.on('moveRight', moveRight)
    socket.on('rotate', rotate)
}

export default GameHandler