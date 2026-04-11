import * as crypto from 'crypto'
import type { TypedServer } from "./io-types"
import { PIECE_COLORS, COLS, ROWS, SPACING, TICK_RATE, TILEHEIGHT, TILEWIDTH, TIME_ATTACK_SECONDS, LINES_PER_LEVEL, LINE_SCORES } from "../shared/config"
import Piece from "./piece"
import Player from "./player"
import { GameMode, PieceProps, PieceType, RGBA, Stack } from "../shared/types"

/**
 * NES-style speed curve expressed in seconds, converted to ticks.
 * Every 10 lines cleared = 1 level up.
 * Changing TICK_RATE affects resolution/smoothness but NOT drop speed.
 */
function dropIntervalForLevel(level: number): number {
    let seconds: number
    if (level <= 0)  seconds = 1.0
    else if (level === 1)  seconds = 0.87
    else if (level === 2)  seconds = 0.73
    else if (level === 3)  seconds = 0.60
    else if (level === 4)  seconds = 0.53
    else if (level <= 6)   seconds = 0.40
    else if (level <= 8)   seconds = 0.27
    else if (level <= 10)  seconds = 0.20
    else if (level <= 13)  seconds = 0.13
    else seconds = 0.07
    return Math.max(1, Math.round(seconds * TICK_RATE))
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
    gameMode: GameMode
    /** Remaining ticks for TIME_ATTACK mode. -1 means no timer. */
    timeRemainingTicks: number
    /** Last emitted second value, to emit timeUpdate only once per second */
    private _lastEmittedSecond: number

    constructor(io: TypedServer, players: Player[]) {
        this.io = io
        this.players = players
        this.firstPiecesRandomProps = [this.getRandomPieceProps(), this.getRandomPieceProps()]

        this.isStarted = false
        this.tickCount = 0
        this.dropInterval = dropIntervalForLevel(0)
        this.level = 0
        this.totalLinesCleared = 0
        this.gameMode = GameMode.CLASSIC
        this.timeRemainingTicks = -1
        this._lastEmittedSecond = -1
    }

    reset() {
        this.firstPiecesRandomProps = [this.getRandomPieceProps(), this.getRandomPieceProps()]
        this.isStarted = false
        this.tickCount = 0
        this.dropInterval = dropIntervalForLevel(0)
        this.level = 0
        this.totalLinesCleared = 0
        this.timeRemainingTicks = -1
        this._lastEmittedSecond = -1
        this.players = []
    }

    /** Start the timer for TIME_ATTACK mode */
    startTimer() {
        if (this.gameMode === GameMode.TIME_ATTACK) {
            this.timeRemainingTicks = TIME_ATTACK_SECONDS * TICK_RATE
            this._lastEmittedSecond = TIME_ATTACK_SECONDS
        }
    }

    /** Advance tick counter. Returns true when a gravity drop should happen. */
    tick(): boolean {
        this.tickCount++
        if (this.timeRemainingTicks > 0) {
            this.timeRemainingTicks--
        }
        return this.tickCount % this.dropInterval === 0
    }

    /** Get remaining seconds (for client display). Returns -1 if no timer. */
    get timeRemainingSeconds(): number {
        if (this.timeRemainingTicks < 0) return -1
        return Math.ceil(this.timeRemainingTicks / TICK_RATE)
    }

    /** Returns true if a timeUpdate should be emitted this tick (once per second). */
    shouldEmitTimeUpdate(): boolean {
        if (this.timeRemainingTicks < 0) return false
        const currentSecond = this.timeRemainingSeconds
        if (currentSecond !== this._lastEmittedSecond) {
            this._lastEmittedSecond = currentSecond
            return true
        }
        return false
    }

    /** Returns true if the time-attack timer has expired. */
    get isTimeExpired(): boolean {
        return this.gameMode === GameMode.TIME_ATTACK && this.timeRemainingTicks === 0
    }

    /**
     * Recalculate level from total lines cleared and adjust drop speed.
     * Uses NES-style curve scaled to our tick rate (TICK_RATE ticks/sec).
     * Returns the new level if it changed, or null.
     */
    updateLevel(): number | null {
        const newLevel = Math.floor(this.totalLinesCleared / LINES_PER_LEVEL)
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

    getPlayer = (playerId: string): Player | null => {
        return this.players.find(p => p.id === playerId) ?? null
    }

    getPlayerStack = (playerId: string): Stack[] | null => {
        return this.getPlayer(playerId)?.stack ?? null
    }

    getPlayerPieces = (playerId: string): Piece[] | null => {
        return this.getPlayer(playerId)?.pieces ?? null
    }

    getPlayerScore = (playerId: string): number | null => {
        return this.getPlayer(playerId)?.score ?? null
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
        const type: PieceType = types[crypto.randomInt(types.length)]
        const color: RGBA = PIECE_COLORS[type]

        return { type, color }
    }

    addToStack = (piece: Piece, stack: Stack[]) => {
        const points = piece.getPoints()
        const x = piece.getX()
        const y = piece.getY()
        for (let i = 0; i < 4; i++) {
            const idxX = (points[i].x + x) / (TILEWIDTH + SPACING)
            const idxY = (points[i].y + y) / (TILEHEIGHT + SPACING)
            const idx = idxY * COLS + idxX
            if (idx < 0 || idx >= stack.length) continue
            stack[idx].isFilled = true
            stack[idx].color = piece.getColor()
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

    addToScore(lineCount: number, playerId: string): number {
        const currentScore = this.getPlayerScore(playerId)
        if (currentScore === null) return 0
        this.totalLinesCleared += lineCount
        let score = currentScore
        const multiplier = this.level + 1
        const basePoints = LINE_SCORES[lineCount]
        if (basePoints) {
            score += basePoints * multiplier
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