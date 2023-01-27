import { ALPHA_MIN, COLOR_PALETTE, COLS, ROWS } from "./config"
import { RGBA, Stack } from "./game"

/* Get a stack with random filled & random colored tiles */
export const stack = function () {
    let newStack = new Array<Stack>(ROWS*COLS)
    for (let i = 0; i < ROWS*COLS; i++) {
        const colors: RGBA[] = COLOR_PALETTE
        const alpha = Math.floor(Math.random() * (255 - ALPHA_MIN)) + ALPHA_MIN
        const color: RGBA = { ...colors[Math.floor(Math.random() * colors.length)], a: alpha}
        newStack[i] = { isFilled: (Math.round(Math.random()) as unknown) as boolean, color}
    }
    return newStack
}