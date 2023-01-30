import { P5CanvasInstance } from "react-p5-wrapper"
import { APP_BACKGROUND_COLOR, BACKGROUND_COLOR, BOARDHEIGHT, BOARDWIDTH, COLOR_PALETTE, COLS, RADIUS, ROWS, SPACING, TILEHEIGHT, TILEWIDTH } from "./config"
import { PieceProps, RGBA, Stack, TileProps } from "./types"

export const drawWin = (p5: P5CanvasInstance, stack: Stack[], cascadeTiles: TileProps[]) => {
    // redraw interline spacings
    const color = APP_BACKGROUND_COLOR
    p5.fill(color.r, color.g, color.b)
    p5.stroke(255,255,255)
    p5.rect(0, 0, BOARDWIDTH, BOARDHEIGHT)

    // reset stack tiles
    stack = function () {
        let newStack = new Array<Stack>(ROWS*COLS)
        for (let i = 0; i < ROWS*COLS; i++) {
            newStack[i] = { isFilled: false, color: { r: 0, g: 0, b: 0, a: 0 } }
        }
        return newStack
    }()
    drawStack(p5, stack)

    // draw cascade tiles
    for (let tile of cascadeTiles) {
        if (tile.y > BOARDHEIGHT - TILEHEIGHT + SPACING) {
            tile.dy = -tile.dy
        } else {
            tile.dy += tile.gravity
        }
        p5.fill(tile.color.r, tile.color.g, tile.color.b, tile.color.a)
        p5.rect(tile.x, tile.y, TILEWIDTH, TILEHEIGHT, RADIUS)
        tile.y += tile.dy
    }

    // "ATTA BOY!!!" text
    p5.fill(0,0,0)
    p5.textSize(55)
    p5.textFont('Helvetica')
    p5.text('ATTA BOY!!!', 5, BOARDHEIGHT / 2 )

    p5.fill(0,0,0)
    p5.textSize(20)
    p5.textFont('Helvetica')
    p5.text('(click to quit game)', 75, BOARDHEIGHT - 40)
}

export const getCascadeTiles = (cascadeTiles: TileProps[], stack: Stack[]) => {
    for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) {
            if (stack[row * COLS + col].isFilled) {
                const tile: TileProps = {
                    x: col * (TILEWIDTH + SPACING),
                    y: row * (TILEHEIGHT + SPACING),
                    dy: 1,
                    gravity: 1,
                    friction: 0.9,
                    color: stack[row * COLS + col].color
                }
                cascadeTiles.push(tile)
            }
        }
    }
}

let i = 0;
export const drawLose = (p5: P5CanvasInstance) => {
    const colors: RGBA[] = COLOR_PALETTE
    p5.fill(colors[i].r, colors[i].g, colors[i].b)
    p5.stroke(255,255,255)
    p5.rect(0, 0, BOARDWIDTH, BOARDHEIGHT)

    p5.fill(0,0,0)
    p5.textSize(55)
    p5.textFont('Helvetica')
    p5.text('YOU SUCK', 15, BOARDHEIGHT / 2 )

    p5.fill(0,0,0)
    p5.textSize(20)
    p5.textFont('Helvetica')
    p5.text('(click to quit game)', 75, BOARDHEIGHT - 40)

    i++
    if (i % 3 === 0) {
        i = 0
    }
}

export const drawStack = (p5: P5CanvasInstance, stack: Stack[]) => {
    let x = 0
    let y = 0
    const bg = BACKGROUND_COLOR
    p5.fill(bg.r, bg.g, bg.b)
    p5.stroke(255,255,255)
    for (let i = 0; i < COLS; i++) {
        for (let j = 0; j < ROWS; j++) {
            const tile = stack[j * COLS + i]
            if (tile.isFilled) {
                p5.fill(tile.color.r, tile.color.g, tile.color.b)
                p5.rect(x, y, TILEWIDTH, TILEHEIGHT, RADIUS)
            } else {
                p5.fill(bg.r, bg.g, bg.b)
                p5.rect(x, y, TILEWIDTH, TILEHEIGHT, RADIUS)
            }
            y += TILEHEIGHT + SPACING
        }
        y = 0
        x += TILEWIDTH + SPACING
    }
}

export const drawPiece = (p5: P5CanvasInstance, currentPiece: PieceProps) => {
    p5.fill(currentPiece.color.r, currentPiece.color.g, currentPiece.color.b)
    for (let i = 0; i < 4; i++) {
        const newX = currentPiece.x + currentPiece.points[i].x
        const newY = currentPiece.y + currentPiece.points[i].y
        p5.rect(
            newX,
            newY,
            TILEWIDTH,
            TILEHEIGHT,
            RADIUS
        )
    }
}

export const drawNextPiece = (p5: P5CanvasInstance, nextPiece: PieceProps) => {
    // cover previous NextPiece
    const color = APP_BACKGROUND_COLOR
    p5.fill(color.r, color.g, color.b)
    p5.noStroke()
    p5.rect(BOARDWIDTH, 0, 320, 128)

    // "Next:" text
    p5.fill(0,0,0)
    p5.textSize(38)
    p5.textFont('Helvetica')
    p5.text('Next:', BOARDWIDTH + 32, 32)

    p5.fill(nextPiece.color.r, nextPiece.color.g, nextPiece.color.b)
    for (let i = 0; i < 4; i++) {
        const newX = nextPiece.x + nextPiece.points[i].x + (TILEWIDTH + SPACING) * 7
        const newY = nextPiece.y + nextPiece.points[i].y + (TILEWIDTH + SPACING) * 2
        p5.rect(
            newX,
            newY,
            TILEWIDTH,
            TILEHEIGHT,
            RADIUS
        )
    }
}

export const drawScore = (p5: P5CanvasInstance, score: number) => {
    // cover previous score
    const color = APP_BACKGROUND_COLOR
    p5.fill(color.r, color.g, color.b)
    p5.noStroke()
    p5.rect(BOARDWIDTH, 196, 320, 128)

    // "Score:" text
    p5.fill(0,0,0)
    p5.textSize(38)
    p5.textFont('Helvetica')
    p5.text('Score:', BOARDWIDTH + 32, 224)

    p5.text(score, BOARDWIDTH + 32, 288)
}