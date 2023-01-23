import { P5CanvasInstance } from "react-p5-wrapper"
import { CANVASHEIGHT, CANVASWIDTH, COLS, RADIUS, ROWS, SPACING, TILEHEIGHT, TILEWIDTH } from "./config"
import { Point, POINTS } from "./points"

export type PieceType = 'bar'|'left_L'|'right_L'|'cube'|'T'|'Z'|'rev_Z'
export type RGB = [number, number, number]
export type PieceProps = {
    type: PieceType,
    color: RGB
}

enum ROTATION {
    FIRST,
    SECOND,
    THIRD,
    FOURTH
}

type Stack = {
    isFilled: boolean,
    color: RGB
}
export class Playground {
    private bgColor: RGB
    stack: Stack[]

    constructor(bgColor = [230, 230, 230] as RGB) {
        this.bgColor = bgColor
        this.stack = new Array<Stack>(ROWS*COLS)
        for (let i = 0; i < ROWS*COLS; i++) {
            this.stack[i] = { isFilled: false, color: this.bgColor }
        }
    }

    addToStack = (piece: Piece) => {
        const points = piece.getPoints()
        const x = piece.getX()
        const y = piece.getY()
        for (let i = 0; i < 4; i++) {
            const idxX = (points[i].x + x) / (TILEWIDTH + SPACING)
            const idxY = (points[i].y + y) / (TILEHEIGHT + SPACING)
            this.stack[idxY * COLS + idxX].isFilled = true
            this.stack[idxY * COLS + idxX].color = piece.getColor()
        }
        this.checkLines()
    }

    removeLine = (row: number) => {
        for (let x = 0; x < COLS; x++) {
            this.stack[row * COLS + x].isFilled = false;
        }
        this.moveDownUpperLines(row)
    }

    moveDownUpperLines = (row: number) => {
        for (let y = row - 1; y > 0; y--) {
            for (let x = 0; x < COLS; x++) {
                this.stack[(y + 1) * COLS + x] = this.stack[y * COLS + x]
            }
        }
    }

    checkLines = () => {
        for (let y = 0; y < ROWS; y++) {
            let lineFilled = true;
            for (let x = 0; x < COLS; x++) {
                if (this.stack[y * COLS + x].isFilled === false) {
                    lineFilled = false;
                    break;
                }
            }
            if (lineFilled) {
                this.removeLine(y)
            }
        }
    }

    draw = (p5: P5CanvasInstance) => {
        let x = 0
        let y = 0
        p5.fill(this.bgColor[0], this.bgColor[1], this.bgColor[2])
        p5.stroke(255,255,255)
        for (let i = 0; i < COLS; i++) {
            for (let j = 0; j < ROWS; j++) {
                const tile = this.stack[j * COLS + i]
                if (tile.isFilled) {
                    p5.fill(tile.color[0], tile.color[1], tile.color[2])
                    p5.rect(x, y, TILEWIDTH, TILEHEIGHT, RADIUS)
                } else {
                    p5.fill(this.bgColor[0], this.bgColor[1], this.bgColor[2])
                    p5.rect(x, y, TILEWIDTH, TILEHEIGHT, RADIUS)
                }
                y += TILEHEIGHT + SPACING
            }
            y = 0
            x += TILEWIDTH + SPACING
        }
    }
}

export class Piece {
    private type: PieceType
    private color: RGB
    private points: [Point, Point, Point, Point]
    private x: number
    private y: number
    private active: boolean
    private disabled: boolean
    private r_state: ROTATION

    constructor(piece: PieceProps) {
        this.type = piece.type
        this.color = piece.color
        this.x = 0
        this.y = 0
        this.r_state = ROTATION.FIRST
        this.active = true
        this.disabled = false
        switch(piece.type) {
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

    canRotate(stack: Stack[]): boolean {
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

            if (this.y + y > CANVASHEIGHT) {
                return false
            }
            if ((this.x + x) < 0 || (this.x + x) > CANVASWIDTH) {
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

    rotate = () => {
        if (!this.isDisabled()) {
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
    }

    down = (stack: Stack[]) => {
        if (!this.isDisabled()) {
            const y = this.y + TILEHEIGHT + SPACING
            if (this.isHittingDown(y, stack)) {
                return
            }
            this.y = y
        }
    }

    isHittingDown(newY: number, stack: Stack[]): boolean {
        for (let i = 0; i < 4; i++) {
            const { x, y } = this.points[i]

            if (newY + y > CANVASHEIGHT) {
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

    isHittingRightOrLeft(newX: number, stack: Stack[]): boolean {
        for (let i = 0; i < 4; i++) {
            const { x, y } = this.points[i]

            if ((newX + x) < 0 || (newX + x) > CANVASWIDTH) {
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

    draw = (p5: P5CanvasInstance) => {
        p5.fill(this.color[0], this.color[1], this.color[2])
        for (let i = 0; i < 4; i++) {
            const halfCols = Math.floor(COLS/2) - 1 // test purpose
            const mid = halfCols * (TILEWIDTH + SPACING) // test purpose
            const x = this.x + this.points[i].x
            const y = this.y + this.points[i].y
            p5.rect(
                x,
                y,
                TILEWIDTH,
                TILEHEIGHT,
                RADIUS
            )
        }
    }
}