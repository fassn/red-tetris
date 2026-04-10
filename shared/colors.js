/** @file Single source of truth for the application color palette.
 * Used by both tailwind.config.js (CSS classes) and canvas rendering (RGBA).
 * All values are hex strings.
 */

const colors = {
    brand: {
        DEFAULT: '#f87171', // red-400 — primary brand color
        hover: '#ef4444',   // red-500 — hover states
        dark: '#b91c1c',    // red-700 — dark text on brand
        darker: '#7f1d1d',  // red-900 — darkest text on brand
        light: '#fee2e2',   // red-100 — subtle borders
    },
    surface: {
        app: '#f8fafc',     // slate-50 — app/canvas background
        board: '#e6e6e6',   // empty board tile background
    },
    piece: {
        red: '#f87171',     // Piece color 1
        green: '#84cc16',   // Piece color 2
        blue: '#60a5fa',    // Piece color 3
    },
    status: {
        ready: '#22c55e',   // green-500
        playing: '#3b82f6', // blue-500
        inactive: '#9ca3af',// gray-400
        muted: '#d1d5db',   // gray-300
    },
    neutral: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
    },
}

module.exports = colors
