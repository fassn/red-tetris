import type { Server, Socket, RemoteSocket } from "socket.io"
import type Game from "./game"
import type { Message } from "../shared/types"
import type { PlayerState } from "../shared/types"
import type { ClientToServerEvents, ServerToClientEvents } from "../shared/socket-events"

export interface SocketData {
    sessionId: string
    playerId: string
    roomName: string
    playerName: string
    playerState: PlayerState
    messages: Message[]
    game: Game
    isReconnect?: boolean
}

export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>
export type TypedRemoteSocket = RemoteSocket<ServerToClientEvents, SocketData>
