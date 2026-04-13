import { useMemo } from 'react'
import { useTheme } from '../context/theme'

// Grid-cell definitions for each tetromino (col, row pairs)
const SHAPES: [number, number][][] = [
    [[0,0],[1,0],[0,1],[1,1]],         // O — cube
    [[0,0],[1,0],[2,0],[1,1]],         // T
    [[0,0],[0,1],[1,1],[2,1]],         // J — left_L
    [[2,0],[0,1],[1,1],[2,1]],         // L — right_L
    [[0,0],[1,0],[1,1],[2,1]],         // Z
    [[1,0],[2,0],[0,1],[1,1]],         // S — rev_Z
]

const COLORS = [
    '#22d3ee', // cyan-400    — I
    '#facc15', // yellow-400  — O
    '#c084fc', // purple-400  — T
    '#60a5fa', // blue-400    — J
    '#fb923c', // orange-400  — L
    '#fb7185', // rose-400    — Z
    '#4ade80', // green-400   — S
]

const OPACITY = 0.15
const GAP_RATIO = 0.1 // Gap as fraction of cell size (game uses 2/30 ≈ 0.067)
const RADIUS_RATIO = 0.25

function rotateShape(cells: [number, number][], times: number): [number, number][] {
    let rotated = cells
    for (let i = 0; i < times; i++) {
        const maxRow = Math.max(...rotated.map(c => c[1]))
        rotated = rotated.map(([col, row]) => [maxRow - row, col])
    }
    return rotated
}

function generatePiece() {
    const shapeIdx = Math.floor(Math.random() * SHAPES.length)
    const gridRotation = Math.floor(Math.random() * 4)
    const cells = rotateShape(SHAPES[shapeIdx], gridRotation)
    const tilt = Math.random() * 40 - 20 // ±20° tilt
    return { cells, color: COLORS[shapeIdx], tilt }
}

const TetrisBackground = () => {
    const { theme } = useTheme()
    const piece = useMemo(() => generatePiece(), [])

    if (theme === 'dark') return null

    // Fixed viewBox (100×100 = 1 unit per 1% of viewport)
    // cellSize is constant so all pieces have identical tile dimensions
    const VB = 100
    const cellSize = 28
    const gap = Math.round(cellSize * GAP_RATIO)
    const tileRadius = Math.round((cellSize - gap) * RADIUS_RATIO)

    // Center the piece within the viewBox
    const maxCol = Math.max(...piece.cells.map(c => c[0])) + 1
    const maxRow = Math.max(...piece.cells.map(c => c[1])) + 1
    const pieceW = maxCol * cellSize
    const pieceH = maxRow * cellSize
    const offsetX = (VB - pieceW) / 2
    const offsetY = (VB - pieceH) / 2

    return (
        <svg
            className='fixed inset-0 w-full h-full pointer-events-none overflow-hidden'
            style={{ zIndex: 0 }}
            aria-hidden='true'
            preserveAspectRatio='xMidYMid slice'
            viewBox={`0 0 ${VB} ${VB}`}
        >
            <g
                transform={`translate(${VB / 2}, ${VB / 2}) rotate(${piece.tilt}) translate(${-VB / 2}, ${-VB / 2})`}
                opacity={OPACITY}
            >
                {piece.cells.map(([col, row], i) => (
                    <rect
                        key={i}
                        x={offsetX + col * cellSize + gap / 2}
                        y={offsetY + row * cellSize + gap / 2}
                        width={cellSize - gap}
                        height={cellSize - gap}
                        rx={tileRadius}
                        fill={piece.color}
                    />
                ))}
            </g>
        </svg>
    )
}

export default TetrisBackground
