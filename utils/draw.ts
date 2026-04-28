import { BOARDHEIGHT, BOARDWIDTH, COLS, RADIUS, ROWS, SPACING, TILEHEIGHT, TILEWIDTH } from "../shared/config"
import { DARK_PIECE_COLORS, LIGHT_PIECE_COLORS } from "../shared/palette"
import { createEmptyStack } from "../shared/stack"
import { PieceProps, PieceType, RGBA, Stack, TileProps } from "../shared/types"

// Cached canvas colors — synced from CSS custom properties via syncCanvasTheme()
let _appBg = '#0f172a'
let _tileBg = '#1e293b'   // Empty tile fill
let _lastTheme = ''

// Mutable tile dimensions — updated via setTileSize() for dynamic viewport scaling
let _tileW = TILEWIDTH
let _tileH = TILEHEIGHT

/** Set tile dimensions for dynamic board sizing. Call before each render loop restart. */
export function setTileSize(tileW: number, tileH: number): void {
    _tileW = tileW
    _tileH = tileH
}

/** Compute logical board dimensions from current tile sizes. */
export function getBoardSize(): { width: number; height: number } {
    return {
        width: _tileW * COLS + SPACING * (COLS - 1),
        height: _tileH * ROWS + SPACING * (ROWS - 1),
    }
}

// Color remap: canonical (dark/server) RGBA → current theme RGBA
const _colorRemap = new Map<string, RGBA>()

function rgbaKey(c: RGBA): string {
    return `${c.r},${c.g},${c.b}`
}

/** Remap a canonical piece color to the current theme's variant. */
export function resolveColor(c: RGBA): RGBA {
    return _colorRemap.get(rgbaKey(c)) ?? c
}

function getDPR(): number {
    return typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1
}

/** Configure a canvas for HiDPI rendering. Returns the 2d context (or null). */
export function setupHiDPI(canvas: HTMLCanvasElement, logicalWidth: number, logicalHeight: number): CanvasRenderingContext2D | null {
    const dpr = getDPR()
    canvas.width = Math.round(logicalWidth * dpr)
    canvas.height = Math.round(logicalHeight * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return ctx
}

/** Return the logical (CSS-pixel) size of a HiDPI canvas. */
function logicalSize(canvas: HTMLCanvasElement): { w: number; h: number } {
    const dpr = getDPR()
    return { w: canvas.width / dpr, h: canvas.height / dpr }
}

/** Read CSS custom properties and cache them for canvas rendering. Also rebuilds the piece color remap. */
export function syncCanvasTheme() {
    if (typeof window === 'undefined') return
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    if (currentTheme === _lastTheme) return
    _lastTheme = currentTheme
    const s = getComputedStyle(document.documentElement)
    _appBg = s.getPropertyValue('--surface-app').trim() || _appBg
    _tileBg = s.getPropertyValue('--surface-tile').trim() || _tileBg

    // Rebuild color remap: canonical (dark) → current theme
    const target = currentTheme === 'dark' ? DARK_PIECE_COLORS : LIGHT_PIECE_COLORS
    _colorRemap.clear()
    for (const type of Object.keys(DARK_PIECE_COLORS) as PieceType[]) {
        _colorRemap.set(rgbaKey(DARK_PIECE_COLORS[type]), target[type])
    }
}

export function getTileBg(): string {
    return _tileBg
}

function rgba(c: RGBA): string {
    return c.a !== undefined ? `rgba(${c.r},${c.g},${c.b},${c.a / 255})` : `rgb(${c.r},${c.g},${c.b})`
}

function tile(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const r = Math.max(2, Math.round(_tileW / 3))
    if (typeof ctx.roundRect === 'function') {
        ctx.beginPath()
        ctx.roundRect(x, y, _tileW, _tileH, r)
        ctx.fill()
    } else {
        ctx.fillRect(x, y, _tileW, _tileH)
    }
}

export const clearCanvas = (ctx: CanvasRenderingContext2D) => {
    const { w, h } = logicalSize(ctx.canvas)
    ctx.fillStyle = _appBg
    ctx.fillRect(0, 0, w, h)
}

export const drawStack = (ctx: CanvasRenderingContext2D, stack: Stack[]) => {
    let x = 0
    let y = 0
    for (let i = 0; i < COLS; i++) {
        for (let j = 0; j < ROWS; j++) {
            const t = stack[j * COLS + i]
            ctx.fillStyle = t.isFilled ? rgba(resolveColor(t.color)) : _tileBg
            tile(ctx, x, y)
            y += _tileH + SPACING
        }
        y = 0
        x += _tileW + SPACING
    }
}

export const drawPiece = (ctx: CanvasRenderingContext2D, currentPiece: PieceProps) => {
    // Server sends pixel coords based on TILEWIDTH+SPACING=32. Convert to local pixel coords.
    const serverStep = TILEWIDTH + SPACING
    const localStep = _tileW + SPACING
    ctx.fillStyle = rgba(resolveColor(currentPiece.color))
    for (let i = 0; i < 4; i++) {
        const col = Math.round((currentPiece.x + currentPiece.points[i].x) / serverStep)
        const row = Math.round((currentPiece.y + currentPiece.points[i].y) / serverStep)
        tile(ctx, col * localStep, row * localStep)
    }
}

const PREVIEW_TILE = 18
const PREVIEW_GAP = 2

export const drawPreviewPiece = (ctx: CanvasRenderingContext2D, piece: PieceProps) => {
    const gridUnit = TILEWIDTH + SPACING
    const { w: canvasW, h: canvasH } = logicalSize(ctx.canvas)

    ctx.fillStyle = _appBg
    ctx.fillRect(0, 0, canvasW, canvasH)

    // Convert pixel-based points to grid coordinates
    const gridPoints = piece.points.map(p => ({
        col: Math.round(p.x / gridUnit),
        row: Math.round(p.y / gridUnit),
    }))

    const minCol = Math.min(...gridPoints.map(p => p.col))
    const maxCol = Math.max(...gridPoints.map(p => p.col))
    const minRow = Math.min(...gridPoints.map(p => p.row))
    const maxRow = Math.max(...gridPoints.map(p => p.row))

    const pieceW = maxCol - minCol + 1
    const pieceH = maxRow - minRow + 1
    const totalW = pieceW * PREVIEW_TILE + (pieceW - 1) * PREVIEW_GAP
    const totalH = pieceH * PREVIEW_TILE + (pieceH - 1) * PREVIEW_GAP
    const offsetX = (canvasW - totalW) / 2
    const offsetY = (canvasH - totalH) / 2

    ctx.fillStyle = rgba(resolveColor(piece.color))
    for (const gp of gridPoints) {
        const x = offsetX + (gp.col - minCol) * (PREVIEW_TILE + PREVIEW_GAP)
        const y = offsetY + (gp.row - minRow) * (PREVIEW_TILE + PREVIEW_GAP)
        if (typeof ctx.roundRect === 'function') {
            ctx.beginPath()
            ctx.roundRect(x, y, PREVIEW_TILE, PREVIEW_TILE, 4)
            ctx.fill()
        } else {
            ctx.fillRect(x, y, PREVIEW_TILE, PREVIEW_TILE)
        }
    }
}

/** Advance the endgame cascade: tiles fall with gravity and settle with damped bounces. */
const BOUNCE_DAMPING = 0.35
const SETTLE_THRESHOLD = 1.5

export const advanceCascadeAnimation = (cascadeTiles: TileProps[]) => {
    const floorY = _tileH * ROWS + SPACING * (ROWS - 1) - _tileH
    for (const t of cascadeTiles) {
        if (t.y >= floorY && Math.abs(t.dy) < SETTLE_THRESHOLD) {
            t.y = floorY
            t.dy = 0
            continue
        }
        t.dy += t.gravity
        t.y += t.dy
        if (t.y >= floorY) {
            t.y = floorY
            t.dy = -Math.abs(t.dy) * BOUNCE_DAMPING
        }
    }
}

/** Draw the endgame board background (empty grid + cascading tiles for win). */
export const drawEndgameBoard = (ctx: CanvasRenderingContext2D, cascadeTiles: TileProps[]) => {
    const { width: bw, height: bh } = getBoardSize()
    ctx.fillStyle = _appBg
    ctx.fillRect(0, 0, bw, bh)

    const emptyStack = createEmptyStack()
    drawStack(ctx, emptyStack)

    for (const t of cascadeTiles) {
        ctx.fillStyle = rgba(resolveColor(t.color))
        tile(ctx, t.x, t.y)
    }
}

export const getCascadeTiles = (cascadeTiles: TileProps[], stack: Stack[]) => {
    for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) {
            if (stack[row * COLS + col].isFilled) {
                const t: TileProps = {
                    x: col * (_tileW + SPACING),
                    y: row * (_tileH + SPACING),
                    dy: 1,
                    gravity: 1,
                    friction: 0.9,
                    color: stack[row * COLS + col].color
                }
                cascadeTiles.push(t)
            }
        }
    }
}

