import { Socket } from "socket.io"
import { COLS, ROWS } from "./config"
import Piece from "./piece"
import { Stack } from "./types"

class Player {
    id: string
    socket: Socket
    name: string
    score: number
    stack: Stack[]
    pieces: Piece[]

    constructor(id: string, socket: Socket, name: string) {
        this.id = id
        this.socket = socket
        this.name = name
        this.score = 0
        this.stack = new Array<Stack>(ROWS*COLS)
        for (let i = 0; i < ROWS*COLS; i++) {
            this.stack[i] = { isFilled: false, color: { r: 0, g: 0, b: 0, a: 0 } }
        }
        this.pieces = []
    }
}

export default Player