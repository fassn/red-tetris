import { BACKGROUND_COLOR, COLS, ROWS } from "./config"
import { PieceProps, Stack } from "./types"

export function createEmptyStack(): Stack[] {
    const stack = new Array<Stack>(ROWS * COLS)
    for (let i = 0; i < ROWS * COLS; i++) {
        stack[i] = { isFilled: false, color: { r: 0, g: 0, b: 0, a: 0 } }
    }
    return stack
}

export function createEmptyPiece(): PieceProps {
    const color = BACKGROUND_COLOR
    return {
        x: 0,
        y: 0,
        points: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
        color: { r: color.r, g: color.g, b: color.b }
    }
}
