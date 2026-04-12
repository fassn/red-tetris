import { describe, it, expect } from 'vitest'
import { checkIfPieceHasHit } from '../server/gameloop'
import Piece from '../server/piece'
import { createEmptyStack } from '../shared/stack'
import { TILEHEIGHT, SPACING } from '../shared/config'
import { isValidName } from '../shared/validation'

// Mirrors parseHash from hooks/use-game-state.ts
function parseHash(url: string) {
    const hash = url.split('#')[1] || ''
    if (!hash) return {}
    const parts = hash.split('/')
    const room = decodeURIComponent(parts[0])
    if (!isValidName(room)) return {}
    const playing = parts[1] === 'playing'
    return { room, playing }
}

describe('parseHash', () => {
    it('parses room from hash', () => {
        const result = parseHash('http://localhost:3000/#myroom')
        expect(result).toEqual({ room: 'myroom', playing: false })
    })

    it('parses room with playing state', () => {
        const result = parseHash('http://localhost:3000/#myroom/playing')
        expect(result).toEqual({ room: 'myroom', playing: true })
    })

    it('ignores unknown hash segments', () => {
        const result = parseHash('http://localhost:3000/#myroom/other')
        expect(result).toEqual({ room: 'myroom', playing: false })
    })

    it('returns empty object for missing hash', () => {
        expect(parseHash('http://localhost:3000/')).toEqual({})
    })

    it('rejects room names with illegal characters', () => {
        expect(parseHash('http://localhost:3000/#my%20room')).toEqual({})
    })

    it('rejects special characters in room name', () => {
        expect(parseHash('http://localhost:3000/#room%40host')).toEqual({})
    })

    it('allows hyphens and underscores', () => {
        const result = parseHash('http://localhost:3000/#my-room_1')
        expect(result).toEqual({ room: 'my-room_1', playing: false })
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
