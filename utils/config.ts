import { RGB } from "./game"

export const FRAMERATE = 15
export const ROWS = 20
export const COLS = 10
export const TILEWIDTH = 30
export const TILEHEIGHT = 30
export const SPACING = 2
export const RADIUS = 10
export const CANVASWIDTH = 750
export const CANVASHEIGHT = TILEHEIGHT * ROWS + SPACING * (ROWS - 1)
export const CANVASCENTER = (Math.floor(COLS / 2) - 1) * (TILEWIDTH + SPACING) // test purpose
export const BOARDWIDTH = TILEWIDTH * COLS + SPACING * (COLS - 1)
export const BOARDHEIGHT = TILEHEIGHT * ROWS + SPACING * (ROWS - 1)
export const BACKGROUND_COLOR: RGB = [230, 230, 230]