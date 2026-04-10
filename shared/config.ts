import { RGBA } from "./types"

export const FRAMERATE = 15
export const ROWS = 20
export const COLS = 10
export const TILEWIDTH = 30
export const TILEHEIGHT = 30
export const SPACING = 2
export const RADIUS = 10
export const CANVASWIDTH = 500
export const CANVASHEIGHT = TILEHEIGHT * ROWS + SPACING * (ROWS - 1)
export const CANVASCENTER = (Math.floor(COLS / 2) - 1) * (TILEWIDTH + SPACING)
export const BOARDWIDTH = TILEWIDTH * COLS + SPACING * (COLS - 1)
export const BOARDHEIGHT = TILEHEIGHT * ROWS + SPACING * (ROWS - 1)
export const APP_BACKGROUND_COLOR: RGBA = { r: 248, g: 250, b: 252, a: 255 }
export const BACKGROUND_COLOR: RGBA = { r: 230, g: 230, b: 230, a: 255 }
export const COLOR_PALETTE = [{ r: 248, g: 113, b: 113 }, { r: 132, g: 204, b: 22 }, { r: 96, g: 165, b: 250}]
export const ALPHA_MIN = 100
export const PIECES_RAIN = 10