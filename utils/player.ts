import type { TypedSocket } from "./socket-types"
import Piece from "./piece"
import { createEmptyStack } from "./stack"
import { Stack } from "./types"

class Player {
    id: string
    socket: TypedSocket
    name: string
    score: number
    stack: Stack[]
    pieces: Piece[]

    constructor(id: string, socket: TypedSocket, name: string) {
        this.id = id
        this.socket = socket
        this.name = name
        this.score = 0
        this.stack = createEmptyStack()
        this.pieces = []
    }
}

export default Player