/**
 * Canvas-ready RGBA constants for rendering code (server + client).
 * Hex values match the CSS custom properties defined in globals.css.
 * Canvas cannot read CSS variables, so these are hardcoded here.
 *
 * Client-side theme-aware values are resolved at runtime via syncCanvasTheme() in draw.ts.
 */
import { RGBA } from './types'

function hexToRgba(hex: string, a = 255): RGBA {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return { r, g, b, a }
}

// Default empty tile color (dark circles on the board)
export const BACKGROUND_COLOR: RGBA = hexToRgba('#1e293b')      // slate-800 — matches --surface-card (dark)

// Piece colors (static — same in both themes)
export const COLOR_PALETTE: RGBA[] = [
    hexToRgba('#f87171'), // red   — matches --brand
    hexToRgba('#84cc16'), // green
    hexToRgba('#60a5fa'), // blue
]

export { hexToRgba }
