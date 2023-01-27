import { Server } from "socket.io"
import { ALPHA_MIN, BOARDHEIGHT, BOARDWIDTH, CANVASCENTER, COLOR_PALETTE, COLS, ROWS, SPACING, TILEHEIGHT, TILEWIDTH } from "./config"
import { Point, POINTS } from "./points"

export type PieceType = 'bar'|'left_L'|'right_L'|'cube'|'T'|'Z'|'rev_Z'
export type RGBA = { r: number, g: number, b: number, a?: number}
enum ROTATION {
    FIRST,
    SECOND,
    THIRD,
    FOURTH
}
export type PieceProps = {
    x: number,
    y: number,
    points: [Point, Point, Point, Point]
    color: RGBA
}
export type Stack = {
    isFilled: boolean,
    color: RGBA
}
export class Game {
    io: Server
    players: Player[]
    firstPiecesRandomProps: { type: PieceType, color: RGBA }[] = Array<{ type: PieceType, color: RGBA }>(2)
    isStarted: boolean
    isOver: boolean

    constructor(io: Server, players: Player[]) {
        this.io = io
        this.players = players
        this.firstPiecesRandomProps = [this.getRandomPieceProps(), this.getRandomPieceProps()]

        this.isStarted = false
        this.isOver = false
    }

    addPlayer = (player: Player) => {
        const firstPiece = new Piece(this.firstPiecesRandomProps[0])
        const secondPiece = new Piece(this.firstPiecesRandomProps[1])
        player.pieces.push(firstPiece, secondPiece)
        this.players.push(player)
    }

    removePlayer = (player: Player) => {
        //
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
                stack[(y + 1) * COLS + x] = stack[y * COLS + x]
            }
        }
    }
}

export class Piece {
    private type: PieceType
    private color: RGBA
    private points: [Point, Point, Point, Point]
    private x: number
    private y: number
    private active: boolean
    private disabled: boolean
    private r_state: ROTATION

    constructor(props: { type: PieceType, color: RGBA }) {
        this.type = props.type
        this.color = props.color
        this.x = CANVASCENTER
        this.y = 0
        this.r_state = ROTATION.FIRST
        this.active = true
        this.disabled = false
        switch(props.type) {
            case 'bar':
                this.points = POINTS.bar[0]
                break;
            case 'left_L':
                this.points = POINTS.left_L[0]
                break
            case 'right_L':
                this.points = POINTS.right_L[0]
                break
            case 'cube':
                this.points = POINTS.cube[0]
                break
            case 'T':
                this.points = POINTS.T[0]
                break
            case 'Z':
                this.points = POINTS.Z[0]
                break
            case 'rev_Z':
                this.points = POINTS.rev_Z[0]
                break
            default:
                throw new Error('The piece type doesn\'t exist.')
        }
    }

    isActive() {
        return this.active
    }

    disable() {
        this.disabled = true
    }

    isDisabled() {
        return this.disabled
    }

    getX() {
        return this.x
    }

    getY() {
        return this.y
    }

    getPoints() {
        return this.points
    }

    getColor() {
        return this.color
    }

    setX(x: number, stack: Stack[]) {
        if (!this.isDisabled()) {
            if (this.isHittingRightOrLeft(x, stack)) {
                return
            }
            this.x = x
        }
    }

    setY(y: number, stack: Stack[]) {
        if (!this.isDisabled()) {
            if (this.isHittingDown(y, stack)) {
                this.active = false
                return
            }
            this.y = y
        }
    }

    rotate(stack: Stack[]): boolean {
        let hasChanged = false
        if (this.canRotate(stack) && !this.isDisabled()) {
            hasChanged = true
            switch (this.r_state) {
                case ROTATION.FIRST:
                    this.r_state = ROTATION.SECOND
                    this.points = POINTS[this.type][1]
                break;
                case ROTATION.SECOND:
                    this.r_state = ROTATION.THIRD
                    this.points = POINTS[this.type][2]
                break;
                case ROTATION.THIRD:
                    this.r_state = ROTATION.FOURTH
                    this.points = POINTS[this.type][3]
                break;
                case ROTATION.FOURTH:
                    this.r_state = ROTATION.FIRST
                    this.points = POINTS[this.type][0]
                break;
            }
        }
        return hasChanged
    }

    down(stack: Stack[]) {
        if (!this.isDisabled()) {
            const y = this.y + TILEHEIGHT + SPACING
            if (this.isHittingDown(y, stack)) {
                return
            }
            this.y = y
        }
    }

    private canRotate(stack: Stack[]): boolean {
        let newPoints: [Point, Point, Point, Point]
        switch (this.r_state) {
            case ROTATION.FIRST:
                newPoints = POINTS[this.type][1]
            break;
            case ROTATION.SECOND:
                newPoints = POINTS[this.type][2]
            break;
            case ROTATION.THIRD:
                newPoints = POINTS[this.type][3]
            break;
            case ROTATION.FOURTH:
                newPoints = POINTS[this.type][0]
            break;
        }

        for (let i = 0; i < 4; i++) {
            const { x, y } = newPoints[i]

            if (this.y + y > BOARDHEIGHT) {
                return false
            }
            if ((this.x + x) < 0 || (this.x + x) > BOARDWIDTH) {
                return false
            }

            const idxX = (this.x + x) / (TILEWIDTH + SPACING)
            const idxY = (this.y + y) / (TILEHEIGHT + SPACING)
            if (stack[idxY * COLS + idxX].isFilled) {
                return false
            }
        }
        return true
    }

    private isHittingDown(newY: number, stack: Stack[]): boolean {
        for (let i = 0; i < 4; i++) {
            const { x, y } = this.points[i]

            if (newY + y > BOARDHEIGHT) {
                return true
            }

            const idxX = (this.x + x) / (TILEWIDTH + SPACING)
            const idxY = (newY + y) / (TILEHEIGHT + SPACING)
            if (stack[idxY * COLS + idxX].isFilled) {
                return true
            }
        }
        return false
    }

    private isHittingRightOrLeft(newX: number, stack: Stack[]): boolean {
        for (let i = 0; i < 4; i++) {
            const { x, y } = this.points[i]

            if ((newX + x) < 0 || (newX + x) > BOARDWIDTH) {
                return true
            }

            const idxX = (newX + x) / (TILEWIDTH + SPACING)
            const idxY = (this.y + y) / (TILEHEIGHT + SPACING)
            if (stack[idxY * COLS + idxX].isFilled) {
                return true
            }
        }
        return false
    }
}

export class Player {
    id: string
    name: string
    score: number
    stack: Stack[]
    pieces: Piece[]

    constructor(id: string, name: string) {
        this.id = id
        this.name = name
        this.score = 0
        this.stack = new Array<Stack>(ROWS*COLS)
        for (let i = 0; i < ROWS*COLS; i++) {
            this.stack[i] = { isFilled: false, color: { r: 0, g: 0, b: 0, a: 0 } }
        }
        this.pieces = []
    }
}