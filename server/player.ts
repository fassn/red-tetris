import type { TypedSocket } from "./io-types"
import Piece from "./piece"
import { createEmptyStack } from "../shared/stack"
import { Stack } from "../shared/types"

class Player {
    id: string
    socket: TypedSocket
    name: string
    score: number
    linesCleared: number
    stack: Stack[]
    pieces: Piece[]
    forfeited: boolean

    constructor(id: string, socket: TypedSocket, name: string) {
        this.id = id
        this.socket = socket
        this.name = name
        this.score = 0
        this.linesCleared = 0
        this.stack = createEmptyStack()
        this.pieces = []
        this.forfeited = false
    }
}

export default Player