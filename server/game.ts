import type { TypedServer } from "./io-types"
import { ALPHA_MIN, COLOR_PALETTE, COLS, FRAMERATE, ROWS, SPACING, TILEHEIGHT, TILEWIDTH } from "../shared/config"
import Piece from "./piece"
import Player from "./player"
import { PieceProps, PieceType, RGBA, Stack } from "../shared/types"

/**
 * NES-style speed curve scaled to our tick rate.
 * Every 10 lines cleared = 1 level up.
 * Drop interval decreases with level: starts at FRAMERATE ticks (1s),
 * reaches 1 tick (~67ms) at level 15+.
 */
function dropIntervalForLevel(level: number): number {
    if (level <= 0) return FRAMERATE       // 15 ticks = 1.00s
    if (level === 1) return 13             //           = 0.87s
    if (level === 2) return 11             //           = 0.73s
    if (level === 3) return 9              //           = 0.60s
    if (level === 4) return 8              //           = 0.53s
    if (level <= 6) return 6              //           = 0.40s
    if (level <= 8) return 4              //           = 0.27s
    if (level <= 10) return 3              //           = 0.20s
    if (level <= 13) return 2              //           = 0.13s
    return 1                               //           = 0.07s
}
class Game {
    io: TypedServer
    players: Player[]
    firstPiecesRandomProps: { type: PieceType, color: RGBA }[] = Array<{ type: PieceType, color: RGBA }>(2)
    isStarted: boolean
    tickCount: number
    dropInterval: number
    level: number
    totalLinesCleared: number

    constructor(io: TypedServer, players: Player[]) {
        this.io = io
        this.players = players
        this.firstPiecesRandomProps = [this.getRandomPieceProps(), this.getRandomPieceProps()]

        this.isStarted = false
        this.tickCount = 0
        this.dropInterval = FRAMERATE // 15 ticks = 1 second at level 0
        this.level = 0
        this.totalLinesCleared = 0
    }

    reset() {
        this.firstPiecesRandomProps = [this.getRandomPieceProps(), this.getRandomPieceProps()]
        this.isStarted = false
        this.tickCount = 0
        this.dropInterval = FRAMERATE
        this.level = 0
        this.totalLinesCleared = 0
        this.players = []
    }

    /** Advance tick counter. Returns true when a gravity drop should happen. */
    tick(): boolean {
        this.tickCount++
        return this.tickCount % this.dropInterval === 0
    }

    /**
     * Recalculate level from total lines cleared and adjust drop speed.
     * Uses NES-style curve scaled to our tick rate (FRAMERATE ticks/sec).
     * Returns the new level if it changed, or null.
     */
    updateLevel(): number | null {
        const newLevel = Math.floor(this.totalLinesCleared / 10)
        if (newLevel === this.level) return null
        this.level = newLevel
        this.dropInterval = dropIntervalForLevel(newLevel)
        return newLevel
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
        this.totalLinesCleared += lineCount
        let score = this.getPlayerScore(playerId)
        // NES scoring: base points × (level + 1)
        const multiplier = this.level + 1
        switch (lineCount) {
            case 1:
                score += 40 * multiplier
                break;
            case 2:
                score += 100 * multiplier
                break;
            case 3:
                score += 300 * multiplier
                break;
            case 4:
                score += 1200 * multiplier
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