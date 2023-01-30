import { Server, Socket } from "socket.io"
import { ALPHA_MIN, BACKGROUND_COLOR, BOARDHEIGHT, BOARDWIDTH, CANVASCENTER, COLOR_PALETTE, COLS, ROWS, SPACING, TILEHEIGHT, TILEWIDTH } from "./config"
import Piece from "./piece"
import Player from "./player"
import { PieceProps, PieceType, Point, RGBA, ROTATION, Stack } from "./types"
class Game {
    io: Server
    players: Player[]
    firstPiecesRandomProps: { type: PieceType, color: RGBA }[] = Array<{ type: PieceType, color: RGBA }>(2)
    isStarted: boolean

    constructor(io: Server, players: Player[]) {
        this.io = io
        this.players = players
        this.firstPiecesRandomProps = [this.getRandomPieceProps(), this.getRandomPieceProps()]

        this.isStarted = false
    }

    reset() {
        this.firstPiecesRandomProps = [this.getRandomPieceProps(), this.getRandomPieceProps()]
        this.isStarted = false
        this.players = []
    }

    addPlayer = (player: Player) => {
        const firstPiece = new Piece(this.firstPiecesRandomProps[0])
        const secondPiece = new Piece(this.firstPiecesRandomProps[1])
        player.pieces.push(firstPiece, secondPiece)
        this.players.push(player)
    }

    removePlayer = (playerId: string) => {
        this.players = this.players.filter(player => player.id !== playerId)
    }

    getPlayerStack = (playerId: string) => {
        for (const player of this.players) {
            if (player.id === playerId) {
                return player.stack
            }
        }
        throw new Error('Stack for the player not found!')
    }

    getPlayerPieces = (playerId: string) => {
        for (const player of this.players) {
            if (player.id === playerId) {
                return player.pieces
            }
        }
        throw new Error('Pieces for the player not found!')
    }

    getPlayerScore = (playerId: string) => {
        for (const player of this.players) {
            if (player.id === playerId) {
                return player.score
            }
        }
        throw new Error('Score for the player not found!')
    }

    private setPlayerScore(score: number, playerId: string) {
        for (const player of this.players) {
            if (player.id === playerId) {
                player.score = score
            }
        }
    }

    getPieceProps = (piece: Piece): PieceProps => {
        return {
            x: piece.getX(),
            y: piece.getY(),
            points: piece.getPoints(),
            color: piece.getColor()
        }
    }

    getRandomPieceProps = (): { type: PieceType, color: RGBA} => {
        const types: PieceType[] = ['bar', 'left_L', 'right_L', 'cube', 'T', 'Z', 'rev_Z']
        const type: PieceType = types[Math.floor(Math.random() * types.length)]

        const colors: RGBA[] = COLOR_PALETTE
        const alpha = Math.floor(Math.random() * (255 - ALPHA_MIN)) + ALPHA_MIN
        const color: RGBA = { ...colors[Math.floor(Math.random() * colors.length)], a: alpha}

        return { type, color }
    }

    addToStack = (piece: Piece, stack: Stack[]) => {
        const points = piece.getPoints()
        const x = piece.getX()
        const y = piece.getY()
        for (let i = 0; i < 4; i++) {
            const idxX = (points[i].x + x) / (TILEWIDTH + SPACING)
            const idxY = (points[i].y + y) / (TILEHEIGHT + SPACING)
            stack[idxY * COLS + idxX].isFilled = true
            stack[idxY * COLS + idxX].color = piece.getColor()
        }
    }

    countFilledLines = (stack: Stack[]) => {
        let lineCount = 0
        for (let y = 0; y < ROWS; y++) {
            let lineFilled = true;
            for (let x = 0; x < COLS; x++) {
                if (stack[y * COLS + x].isFilled === false) {
                    lineFilled = false;
                    break;
                }
            }
            if (lineFilled) {
                lineCount++
                this.removeLine(stack, y)
            }
        }
        return lineCount
    }

    addToScore(lineCount: number, playerId: string) {
        let score = this.getPlayerScore(playerId)
        switch (lineCount) {
            case 1:
                score += 40
                break;
            case 2:
                score += 100
                break;
            case 3:
                score += 300
                break;
            case 4:
                score += 1200
        }
        this.setPlayerScore(score, playerId)
        return score
    }

    private removeLine = (stack: Stack[], row: number) => {
        for (let x = 0; x < COLS; x++) {
            stack[row * COLS + x].isFilled = false;
        }
        this.moveDownUpperLines(stack, row)
    }

    private moveDownUpperLines = (stack: Stack[], row: number) => {
        for (let y = row - 1; y > 0; y--) {
            for (let x = 0; x < COLS; x++) {
                /* I have NO IDEA why the latter makes the array "corrupt"
                after 18 cleared lines */
                const tile = stack[y * COLS + x]
                stack[(y + 1) * COLS + x] = {...tile}
                // stack[(y + 1) * COLS + x] = stack[y * COLS + x]
            }
        }
    }
}

export default Game