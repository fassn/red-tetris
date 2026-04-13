import { describe, it, expect } from 'vitest'
import { checkIfPieceHasHit } from '../server/gameloop'
import Piece from '../server/piece'
import { createEmptyStack } from '../shared/stack'
import { TILEHEIGHT, SPACING } from '../shared/config'

describe('checkIfPieceHasHit', () => {
    it('returns false for an active piece', () => {
        const piece = new Piece({ type: 'bar', color: { r: 0, g: 0, b: 0, a: 255 } })
        expect(checkIfPieceHasHit(piece)).toBe(false)
    })

    it('returns false for a disabled piece', () => {
        const piece = new Piece({ type: 'bar', color: { r: 0, g: 0, b: 0, a: 255 } })
        piece.disable()
        expect(checkIfPieceHasHit(piece)).toBe(false)
    })

    it('returns true when piece has landed (inactive, not disabled)', () => {
        const piece = new Piece({ type: 'cube', color: { r: 0, g: 0, b: 0, a: 255 } })
        const stack = createEmptyStack()
        const step = TILEHEIGHT + SPACING
        // Use setY (which deactivates on collision) like the game loop does
        for (let i = 0; i < 100; i++) {
            piece.setY(piece.getY() + step, stack)
            if (!piece.isActive()) break
        }
        expect(checkIfPieceHasHit(piece)).toBe(true)
    })
})
