import { ALPHA_MIN, BOARDHEIGHT, COLOR_PALETTE, COLS, PIECES_RAIN, ROWS, SPACING, TILEHEIGHT, TILEWIDTH } from "./config"
import { POINTS } from "./points"
import { PieceType, Point, RGBA, Stack } from "./types"

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

const getRandomProps = (): { points: [Point, Point, Point, Point], min_h: number, max_h: number, color: RGBA, dy: number, gravity: number, friction: number } => {
    const dy = 1
    const gravity = 1
    const friction = 0.9

    const types: PieceType[] = ['bar', 'left_L', 'right_L', 'cube', 'T', 'Z', 'rev_Z']
    const type: PieceType = types[Math.floor(Math.random() * types.length)]

    let points: [Point, Point, Point, Point] = structuredClone(POINTS[type][Math.floor(Math.random() * 3)])
    let randomX = Math.floor(Math.random() * 8) * (TILEWIDTH + SPACING) - TILEWIDTH - SPACING
    let randomY = Math.floor(Math.random() * 10) * (TILEHEIGHT + SPACING)

    let min_h = BOARDHEIGHT
    let max_h = 0
    for (let i = 0; i < 4; i++) {
        points[i].x += + randomX
        points[i].y += + randomY
        if (max_h < points[i].y) {
            max_h = points[i].y
        }
        if (min_h > points[i].y) {
            min_h = points[i].y
        }
    }

    const colors: RGBA[] = COLOR_PALETTE
    const randomAlpha = Math.floor(Math.random() * (255 - ALPHA_MIN)) + ALPHA_MIN
    const color: RGBA = {...colors[Math.floor(Math.random() * colors.length)], a: randomAlpha}

    return { points, min_h, max_h, color, dy, gravity, friction }
}

const piecesProps: { points: [Point, Point, Point, Point], min_h: number, max_h: number, color: RGBA, dy: number, gravity: number, friction: number }[] = []
for (let i = 0; i < PIECES_RAIN; i++) {
    piecesProps.push(getRandomProps())
}