/**
 * TypeScript re-export of the shared color palette with RGBA helpers for canvas rendering.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const palette = require('./colors.js')
import { RGBA } from './types'

function hexToRgba(hex: string, a = 255): RGBA {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return { r, g, b, a }
}

// Canvas-ready RGBA colors
export const APP_BACKGROUND_COLOR: RGBA = hexToRgba(palette.surface.app)
export const BACKGROUND_COLOR: RGBA = hexToRgba(palette.surface.board)
export const COLOR_PALETTE: RGBA[] = [
    hexToRgba(palette.piece.red),
    hexToRgba(palette.piece.green),
    hexToRgba(palette.piece.blue),
]

export { palette, hexToRgba }
