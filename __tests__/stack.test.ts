import { describe, it, expect } from 'vitest'
import { createEmptyStack, createEmptyPiece } from '../shared/stack'
import { COLS, ROWS, BACKGROUND_COLOR } from '../shared/config'

describe('createEmptyStack', () => {
    it('creates a stack with ROWS * COLS tiles', () => {
        const stack = createEmptyStack()
        expect(stack).toHaveLength(ROWS * COLS)
    })

    it('all tiles are unfilled', () => {
        const stack = createEmptyStack()
        for (const tile of stack) {
            expect(tile.isFilled).toBe(false)
        }
    })

    it('returns independent arrays (no shared references)', () => {
        const a = createEmptyStack()
        const b = createEmptyStack()
        a[0].isFilled = true
        expect(b[0].isFilled).toBe(false)
    })
})

describe('createEmptyPiece', () => {
    it('returns a piece at origin with background color', () => {
        const piece = createEmptyPiece()
        expect(piece.x).toBe(0)
        expect(piece.y).toBe(0)
        expect(piece.color.r).toBe(BACKGROUND_COLOR.r)
        expect(piece.color.g).toBe(BACKGROUND_COLOR.g)
        expect(piece.color.b).toBe(BACKGROUND_COLOR.b)
    })

    it('has 4 zero-position points', () => {
        const piece = createEmptyPiece()
        expect(piece.points).toHaveLength(4)
        for (const point of piece.points) {
            expect(point.x).toBe(0)
            expect(point.y).toBe(0)
        }
    })
})
