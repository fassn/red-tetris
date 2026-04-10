import type { Server, Socket, RemoteSocket } from "socket.io"
import type Game from "./game"
import type { Message } from "./stores/message-store"
import type { PieceProps, PlayerState, Point, Stack } from "./types"

export interface ServerToClientEvents {
    session: (data: { sessionId: string; playerId: string }) => void
    messages: (messages: Message[]) => void
    roomIsFull: () => void
    newState: (data: { playerState?: PlayerState; otherPlayerState?: PlayerState }) => void
    newGame: (data: { newStack: Stack[]; firstPiece: PieceProps; secondPiece: PieceProps }) => void
    newStack: (data: { newStack: Stack[]; newScore: number }) => void
    newPosition: (newY: number) => void
    newPiece: (data: { newCurrentPiece: PieceProps; newNextPiece: PieceProps }) => void
    newMoveDown: (newY: number) => void
    newMoveLeft: (newX: number) => void
    newMoveRight: (newX: number) => void
    newPoints: (points: [Point, Point, Point, Point]) => void
    gameWon: () => void
    resetGame: () => void
    newIncomingMsg: (msg: Message) => void
}

export interface ClientToServerEvents {
    setReady: (isReady: boolean) => void
    startGame: () => void
    moveDown: () => void
    moveLeft: () => void
    moveRight: () => void
    rotate: () => void
    quitGame: () => void
    createdMessage: (msg: Message) => void
}

export interface SocketData {
    sessionId: string
    playerId: string
    roomName: string
    playerName: string
    playerState: PlayerState
    messages: Message[]
    game: Game
}

export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>
export type TypedRemoteSocket = RemoteSocket<ServerToClientEvents, SocketData>
