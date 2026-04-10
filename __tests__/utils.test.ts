import { describe, it, expect } from 'vitest'
import { checkIfPieceHasHit } from '../server/gameloop'
import Piece from '../server/piece'
import { createEmptyStack } from '../shared/stack'
import { TILEHEIGHT, SPACING } from '../shared/config'

// parseHash is defined inline in pages/index.tsx — replicate it here for testing
function parseHash(url: string) {
    const hash = url.split('#')[1] || ''
    const separatorIndex = hash.indexOf('/')
    if (separatorIndex === -1) return {}
    const room = decodeURIComponent(hash.slice(0, separatorIndex))
    const playerName = decodeURIComponent(hash.slice(separatorIndex + 1))
    if (!room || !playerName) return {}
    return { room, playerName }
}

describe('parseHash', () => {
    it('parses room and player name from hash', () => {
        const result = parseHash('http://localhost:3000/#myroom/player1')
        expect(result).toEqual({ room: 'myroom', playerName: 'player1' })
    })

    it('returns empty object for missing hash', () => {
        expect(parseHash('http://localhost:3000/')).toEqual({})
    })

    it('returns empty object for hash without separator', () => {
        expect(parseHash('http://localhost:3000/#noroomsep')).toEqual({})
    })

    it('handles URL-encoded names', () => {
        const result = parseHash('http://localhost:3000/#my%20room/player%20one')
        expect(result).toEqual({ room: 'my room', playerName: 'player one' })
    })

    it('returns empty object when room is empty', () => {
        expect(parseHash('http://localhost:3000/#/player')).toEqual({})
    })

    it('returns empty object when player is empty', () => {
        expect(parseHash('http://localhost:3000/#room/')).toEqual({})
    })

    it('handles special characters', () => {
        const result = parseHash('http://localhost:3000/#room%2Fname/player%40host')
        expect(result).toEqual({ room: 'room/name', playerName: 'player@host' })
    })
})

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
