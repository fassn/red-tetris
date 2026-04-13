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

// Dark theme: pastel tones that pop on dark backgrounds
export const DARK_PIECE_COLORS: Record<PieceType, RGBA> = {
    bar:     hexToRgba('#a5f3fc'), // Cyan-200    — I piece
    cube:    hexToRgba('#fde68a'), // Amber-200   — O piece
    T:       hexToRgba('#d8b4fe'), // Purple-300  — T piece
    rev_Z:   hexToRgba('#86efac'), // Green-300   — S piece
    Z:       hexToRgba('#f9a8d4'), // Pink-300    — Z piece
    left_L:  hexToRgba('#93c5fd'), // Blue-300    — J piece
    right_L: hexToRgba('#fdba74'), // Orange-300  — L piece
}

// Light theme: medium tones (400-level) — readable on slate-200 without being harsh
export const LIGHT_PIECE_COLORS: Record<PieceType, RGBA> = {
    bar:     hexToRgba('#22d3ee'), // Cyan-400    — I piece
    cube:    hexToRgba('#facc15'), // Yellow-400  — O piece
    T:       hexToRgba('#c084fc'), // Purple-400  — T piece
    rev_Z:   hexToRgba('#4ade80'), // Green-400   — S piece
    Z:       hexToRgba('#fb7185'), // Rose-400    — Z piece
    left_L:  hexToRgba('#60a5fa'), // Blue-400    — J piece
    right_L: hexToRgba('#fb923c'), // Orange-400  — L piece
}

// Server uses dark (canonical) colors — client remaps at render time via resolveColor()
export const PIECE_COLORS: Record<PieceType, RGBA> = DARK_PIECE_COLORS
export const PIECE_COLOR_LIST: RGBA[] = Object.values(PIECE_COLORS)

export { hexToRgba }
