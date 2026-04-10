import { describe, it, expect } from 'vitest'
import Piece from '../server/piece'
import { createEmptyStack } from '../shared/stack'
import { CANVASCENTER, SPACING, TILEWIDTH, TILEHEIGHT, COLS } from '../shared/config'
import { PieceType, ROTATION } from '../shared/types'

function makePiece(type: PieceType = 'bar') {
    return new Piece({ type, color: { r: 255, g: 0, b: 0, a: 255 } })
}

describe('Piece', () => {
    describe('constructor', () => {
        it('creates a piece at CANVASCENTER with y=0', () => {
            const piece = makePiece('bar')
            expect(piece.getX()).toBe(CANVASCENTER)
            expect(piece.getY()).toBe(0)
        })

        it('creates all 7 piece types without throwing', () => {
            const types: PieceType[] = ['bar', 'left_L', 'right_L', 'cube', 'T', 'Z', 'rev_Z']
            for (const type of types) {
                expect(() => makePiece(type)).not.toThrow()
            }
        })

        it('throws for unknown piece type', () => {
            expect(() => new Piece({ type: 'invalid' as PieceType, color: { r: 0, g: 0, b: 0, a: 255 } }))
                .toThrow("The piece type doesn't exist.")
        })

        it('has 4 points', () => {
            const piece = makePiece('T')
            expect(piece.getPoints()).toHaveLength(4)
        })
    })

    describe('movement', () => {
        it('moves down on an empty stack', () => {
            const piece = makePiece('bar')
            const stack = createEmptyStack()
            const initialY = piece.getY()
            piece.down(stack)
            expect(piece.getY()).toBe(initialY + TILEHEIGHT + SPACING)
        })

        it('moves left via setX', () => {
            const piece = makePiece('bar')
            const stack = createEmptyStack()
            const step = TILEWIDTH + SPACING
            piece.setX(piece.getX() - step, stack)
            expect(piece.getX()).toBe(CANVASCENTER - step)
        })

        it('moves right via setX', () => {
            const piece = makePiece('bar')
            const stack = createEmptyStack()
            const step = TILEWIDTH + SPACING
            piece.setX(piece.getX() + step, stack)
            expect(piece.getX()).toBe(CANVASCENTER + step)
        })

        it('does not move when disabled', () => {
            const piece = makePiece('bar')
            const stack = createEmptyStack()
            piece.disable()
            const y = piece.getY()
            piece.down(stack)
            expect(piece.getY()).toBe(y)
        })
    })

    describe('collision', () => {
        it('stops at the bottom of the board', () => {
            const piece = makePiece('cube')
            const stack = createEmptyStack()
            const step = TILEHEIGHT + SPACING
            // Use setY (which deactivates on collision) like the game loop does
            for (let i = 0; i < 100; i++) {
                piece.setY(piece.getY() + step, stack)
                if (!piece.isActive()) break
            }
            expect(piece.isActive()).toBe(false)
        })

        it('stops when hitting a filled tile', () => {
            const piece = makePiece('bar')
            const stack = createEmptyStack()
            const step = TILEWIDTH + SPACING

            // Fill a row near the piece's x position
            const targetRow = 5
            for (let x = 0; x < COLS; x++) {
                stack[targetRow * COLS + x].isFilled = true
            }

            // Move piece down; it should stop before the filled row
            for (let i = 0; i < 100; i++) {
                const newY = piece.getY() + step
                piece.setY(newY, stack)
                if (!piece.isActive()) break
            }
            expect(piece.isActive()).toBe(false)
        })

        it('cannot move through left wall', () => {
            const piece = makePiece('bar')
            const stack = createEmptyStack()
            const step = TILEWIDTH + SPACING

            // Move far left
            for (let i = 0; i < 20; i++) {
                piece.setX(piece.getX() - step, stack)
            }
            expect(piece.getX()).toBeGreaterThanOrEqual(0)
        })
    })

    describe('rotation', () => {
        it('rotates on an empty stack', () => {
            const piece = makePiece('T')
            const stack = createEmptyStack()
            const pointsBefore = JSON.stringify(piece.getPoints())
            const rotated = piece.rotate(stack)
            expect(rotated).toBe(true)
            expect(JSON.stringify(piece.getPoints())).not.toBe(pointsBefore)
        })

        it('cycles through 4 rotations back to start', () => {
            const piece = makePiece('T')
            const stack = createEmptyStack()
            const initial = JSON.stringify(piece.getPoints())
            piece.rotate(stack)
            piece.rotate(stack)
            piece.rotate(stack)
            piece.rotate(stack)
            expect(JSON.stringify(piece.getPoints())).toBe(initial)
        })

        it('does not rotate when disabled', () => {
            const piece = makePiece('T')
            const stack = createEmptyStack()
            piece.disable()
            const rotated = piece.rotate(stack)
            expect(rotated).toBe(false)
        })

        it('cube rotation returns same points', () => {
            const piece = makePiece('cube')
            const stack = createEmptyStack()
            const before = JSON.stringify(piece.getPoints())
            piece.rotate(stack)
            expect(JSON.stringify(piece.getPoints())).toBe(before)
        })
    })
})
