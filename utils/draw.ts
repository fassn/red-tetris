import { APP_BACKGROUND_COLOR, BACKGROUND_COLOR, BOARDHEIGHT, BOARDWIDTH, COLOR_PALETTE, COLS, RADIUS, ROWS, SPACING, TILEHEIGHT, TILEWIDTH } from "../shared/config"
import { createEmptyStack } from "../shared/stack"
import { PieceProps, RGBA, Stack, TileProps } from "../shared/types"

function rgba(c: RGBA): string {
    return c.a !== undefined ? `rgba(${c.r},${c.g},${c.b},${c.a / 255})` : `rgb(${c.r},${c.g},${c.b})`
}

function tile(ctx: CanvasRenderingContext2D, x: number, y: number, stroke = true) {
    ctx.beginPath()
    ctx.roundRect(x, y, TILEWIDTH, TILEHEIGHT, RADIUS)
    ctx.fill()
    if (stroke) ctx.stroke()
}

export const drawStack = (ctx: CanvasRenderingContext2D, stack: Stack[]) => {
    const bg = BACKGROUND_COLOR
    ctx.strokeStyle = 'white'
    let x = 0
    let y = 0
    for (let i = 0; i < COLS; i++) {
        for (let j = 0; j < ROWS; j++) {
            const t = stack[j * COLS + i]
            ctx.fillStyle = t.isFilled ? rgba(t.color) : rgba(bg)
            tile(ctx, x, y)
            y += TILEHEIGHT + SPACING
        }
        y = 0
        x += TILEWIDTH + SPACING
    }
}

export const drawPiece = (ctx: CanvasRenderingContext2D, currentPiece: PieceProps) => {
    ctx.fillStyle = rgba(currentPiece.color)
    ctx.strokeStyle = 'white'
    for (let i = 0; i < 4; i++) {
        tile(ctx, currentPiece.x + currentPiece.points[i].x, currentPiece.y + currentPiece.points[i].y)
    }
}

export const drawNextPiece = (ctx: CanvasRenderingContext2D, nextPiece: PieceProps) => {
    // Cover previous next-piece area
    ctx.fillStyle = rgba(APP_BACKGROUND_COLOR)
    ctx.fillRect(BOARDWIDTH, 0, 320, 128)

    // "Next:" label
    ctx.fillStyle = 'black'
    ctx.font = '38px Helvetica'
    ctx.fillText('Next:', BOARDWIDTH + 32, 32)

    // Draw preview piece (no stroke border)
    ctx.fillStyle = rgba(nextPiece.color)
    for (let i = 0; i < 4; i++) {
        tile(
            ctx,
            nextPiece.x + nextPiece.points[i].x + (TILEWIDTH + SPACING) * 7,
            nextPiece.y + nextPiece.points[i].y + (TILEWIDTH + SPACING) * 2,
            false
        )
    }
}

export const drawScore = (ctx: CanvasRenderingContext2D, score: number) => {
    // Cover previous score area
    ctx.fillStyle = rgba(APP_BACKGROUND_COLOR)
    ctx.fillRect(BOARDWIDTH, 196, 320, 128)

    ctx.fillStyle = 'black'
    ctx.font = '38px Helvetica'
    ctx.fillText('Score:', BOARDWIDTH + 32, 224)
    ctx.fillText(String(score), BOARDWIDTH + 32, 288)
}

export const drawWin = (ctx: CanvasRenderingContext2D, stack: Stack[], cascadeTiles: TileProps[]) => {
    ctx.fillStyle = rgba(APP_BACKGROUND_COLOR)
    ctx.strokeStyle = 'white'
    ctx.fillRect(0, 0, BOARDWIDTH, BOARDHEIGHT)
    ctx.strokeRect(0, 0, BOARDWIDTH, BOARDHEIGHT)

    stack = createEmptyStack()
    drawStack(ctx, stack)

    // Draw bouncing cascade tiles
    for (const t of cascadeTiles) {
        if (t.y > BOARDHEIGHT - TILEHEIGHT + SPACING) {
            t.dy = -t.dy
        } else {
            t.dy += t.gravity
        }
        ctx.fillStyle = rgba(t.color)
        tile(ctx, t.x, t.y)
        t.y += t.dy
    }

    ctx.fillStyle = 'black'
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

export const drawLose = (ctx: CanvasRenderingContext2D, colorIndex: number): number => {
    const colors = COLOR_PALETTE
    ctx.fillStyle = rgba(colors[colorIndex])
    ctx.strokeStyle = 'white'
    ctx.fillRect(0, 0, BOARDWIDTH, BOARDHEIGHT)
    ctx.strokeRect(0, 0, BOARDWIDTH, BOARDHEIGHT)

    ctx.fillStyle = 'black'
    ctx.font = '55px Helvetica'
    ctx.fillText('YOU SUCK', 15, BOARDHEIGHT / 2)
    ctx.font = '20px Helvetica'
    ctx.fillText('(click to quit game)', 75, BOARDHEIGHT - 40)

    return (colorIndex + 1) % colors.length
}