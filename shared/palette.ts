/**
 * Canvas-ready RGBA constants for rendering code (server + client).
 * Hex values match the CSS custom properties defined in globals.css.
 * Canvas cannot read CSS variables, so these are hardcoded here.
 *
 * Client-side theme-aware values are resolved at runtime via syncCanvasTheme() in draw.ts.
 */
import { RGBA, PieceType } from './types'

function hexToRgba(hex: string, a = 255): RGBA {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return { r, g, b, a }
}

// Default empty tile color (dark circles on the board)
export const BACKGROUND_COLOR: RGBA = hexToRgba('#1e293b')      // slate-800 — matches --surface-card (dark)

// Pastel color per piece type (Tetris Guideline mapping)
export const PIECE_COLORS: Record<PieceType, RGBA> = {
    bar:     hexToRgba('#a5f3fc'), // Soft Cyan    — I piece
    cube:    hexToRgba('#fde68a'), // Soft Yellow  — O piece
    T:       hexToRgba('#d8b4fe'), // Soft Purple  — T piece
    rev_Z:   hexToRgba('#86efac'), // Soft Green   — S piece
    Z:       hexToRgba('#f9a8d4'), // Soft Pink    — Z piece
    left_L:  hexToRgba('#93c5fd'), // Soft Blue    — J piece
    right_L: hexToRgba('#fdba74'), // Soft Orange  — L piece
}

// Flat array for effects that need to cycle through colors (e.g. lose screen flash)
export const PIECE_COLOR_LIST: RGBA[] = Object.values(PIECE_COLORS)

export { hexToRgba }
