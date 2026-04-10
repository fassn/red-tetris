import React from "react";
import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "../shared/socket-events";

interface ClientSocketWithProps extends Socket<ServerToClientEvents, ClientToServerEvents> {
    playerId?: string
}

const URL = process.env.NEXT_PUBLIC_SOCKET_URL
export const socket: ClientSocketWithProps = io(URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
}) as ClientSocketWithProps
export const SocketContext = React.createContext(socket);