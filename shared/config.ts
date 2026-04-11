export { BACKGROUND_COLOR, PIECE_COLORS, PIECE_COLOR_LIST } from './palette'

export const TICK_RATE = 60 // Server ticks per second (~16.67ms per tick)
export const SOFT_DROP_MS = 50 // Minimum ms between soft-drop moves (down key held)
export const MAX_PLAYERS = 4
export const TIME_ATTACK_SECONDS = 120 // 2 minutes
export const ROWS = 20
export const COLS = 10
export const TILEWIDTH = 30
export const TILEHEIGHT = 30
export const SPACING = 2
export const RADIUS = 10
export const CANVASCENTER = (Math.floor(COLS / 2) - 1) * (TILEWIDTH + SPACING)
export const BOARDWIDTH = TILEWIDTH * COLS + SPACING * (COLS - 1)
export const BOARDHEIGHT = TILEHEIGHT * ROWS + SPACING * (ROWS - 1)
export const PIECES_RAIN = 10