import { BOARDHEIGHT, BOARDWIDTH, PIECE_COLOR_LIST, COLS, RADIUS, ROWS, SPACING, TILEHEIGHT, TILEWIDTH } from "../shared/config"
import { createEmptyStack } from "../shared/stack"
import { PieceProps, RGBA, Stack, TileProps } from "../shared/types"

// Cached canvas colors — synced from CSS custom properties via syncCanvasTheme()
let _appBg = '#0f172a'
let _tileBg = '#1e293b'   // Empty tile fill
let _textColor = '#f1f5f9' // Text on canvas (matches --content)
let _lastTheme = ''

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

/** Read CSS custom properties and cache them for canvas rendering. Skips if theme hasn't changed. */
export function syncCanvasTheme() {
    if (typeof window === 'undefined') return
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    if (currentTheme === _lastTheme) return
    _lastTheme = currentTheme
    const s = getComputedStyle(document.documentElement)
    _appBg = s.getPropertyValue('--surface-app').trim() || _appBg
    _tileBg = s.getPropertyValue('--surface-tile').trim() || _tileBg
    _textColor = s.getPropertyValue('--content').trim() || _textColor
}

export function getTileBg(): string {
    return _tileBg
}

function rgba(c: RGBA): string {
    return c.a !== undefined ? `rgba(${c.r},${c.g},${c.b},${c.a / 255})` : `rgb(${c.r},${c.g},${c.b})`
}

function tile(ctx: CanvasRenderingContext2D, x: number, y: number) {
    if (typeof ctx.roundRect === 'function') {
        ctx.beginPath()
        ctx.roundRect(x, y, TILEWIDTH, TILEHEIGHT, RADIUS)
        ctx.fill()
    } else {
        ctx.fillRect(x, y, TILEWIDTH, TILEHEIGHT)
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
            ctx.fillStyle = t.isFilled ? rgba(t.color) : _tileBg
            tile(ctx, x, y)
            y += TILEHEIGHT + SPACING
        }
        y = 0
        x += TILEWIDTH + SPACING
    }
}

export const drawPiece = (ctx: CanvasRenderingContext2D, currentPiece: PieceProps) => {
    ctx.fillStyle = rgba(currentPiece.color)
    for (let i = 0; i < 4; i++) {
        tile(ctx, currentPiece.x + currentPiece.points[i].x, currentPiece.y + currentPiece.points[i].y)
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

    ctx.fillStyle = rgba(piece.color)
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

export const advanceWinAnimation = (cascadeTiles: TileProps[]) => {
    for (const t of cascadeTiles) {
        if (t.y > BOARDHEIGHT - TILEHEIGHT + SPACING) {
            t.dy = -t.dy
        } else {
            t.dy += t.gravity
        }
        t.y += t.dy
    }
}

export const drawWin = (ctx: CanvasRenderingContext2D, stack: Stack[], cascadeTiles: TileProps[]) => {
    ctx.fillStyle = _appBg
    ctx.fillRect(0, 0, BOARDWIDTH, BOARDHEIGHT)

    const emptyStack = createEmptyStack()
    drawStack(ctx, emptyStack)

    for (const t of cascadeTiles) {
        ctx.fillStyle = rgba(t.color)
        tile(ctx, t.x, t.y)
    }

    ctx.fillStyle = _textColor
    ctx.font = '55px Helvetica'
    ctx.fillText('ATTA BOY!!!', 5, BOARDHEIGHT / 2)
    ctx.font = '20px Helvetica'
    ctx.fillText('(click to quit game)', 75, BOARDHEIGHT - 40)
}

export const getCascadeTiles = (cascadeTiles: TileProps[], stack: Stack[]) => {
    for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) {
            if (stack[row * COLS + col].isFilled) {
                const t: TileProps = {
                    x: col * (TILEWIDTH + SPACING),
                    y: row * (TILEHEIGHT + SPACING),
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

export const drawLose = (ctx: CanvasRenderingContext2D, colorIndex: number) => {
    const colors = PIECE_COLOR_LIST
    ctx.fillStyle = rgba(colors[colorIndex])
    ctx.fillRect(0, 0, BOARDWIDTH, BOARDHEIGHT)

    ctx.fillStyle = _textColor
    ctx.font = '55px Helvetica'
    ctx.fillText('YOU SUCK', 15, BOARDHEIGHT / 2)
    ctx.font = '20px Helvetica'
    ctx.fillText('(click to quit game)', 75, BOARDHEIGHT - 40)
}