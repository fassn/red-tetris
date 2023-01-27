import React from "react";
import { io, Socket } from "socket.io-client";

interface ClientSocketWithProps extends Socket {
    playerId?: string
}

const URL = process.env.NEXT_PUBLIC_SOCKET_URL
export const socket: ClientSocketWithProps = io(URL, { autoConnect: false })
export const SocketContext = React.createContext(socket);