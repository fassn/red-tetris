import { describe, it, expect, vi, beforeEach } from 'vitest'
import Game from '../server/game'
import Piece from '../server/piece'
import { createEmptyStack } from '../shared/stack'
import { COLS, ROWS, SPACING, TILEWIDTH, TILEHEIGHT } from '../shared/config'

// Minimal mock for TypedServer (not used in pure logic tests)
const mockIo = {} as any

// Helper to create a game with a mock player
function createTestGame() {
    const game = new Game(mockIo, [])
    return game
}

function createMockPlayer(id: string) {
    return {
        id,
        socket: { id: `socket-${id}`, data: { playerState: { host: false, playState: 0 } } },
        name: `player-${id}`,
        score: 0,
        stack: createEmptyStack(),
        pieces: [],
    } as any
}

describe('Game', () => {
    describe('addToScore', () => {
        it('awards 40 points for 1 line', () => {
            const game = createTestGame()
            const player = createMockPlayer('p1')
            game.players.push(player)
            const score = game.addToScore(1, 'p1')
            expect(score).toBe(40)
        })

        it('awards 100 points for 2 lines', () => {
            const game = createTestGame()
            const player = createMockPlayer('p1')
            game.players.push(player)
            const score = game.addToScore(2, 'p1')
            expect(score).toBe(100)
        })

        it('awards 300 points for 3 lines', () => {
            const game = createTestGame()
            const player = createMockPlayer('p1')
            game.players.push(player)
            const score = game.addToScore(3, 'p1')
            expect(score).toBe(300)
        })

        it('awards 1200 points for a tetris (4 lines)', () => {
            const game = createTestGame()
            const player = createMockPlayer('p1')
            game.players.push(player)
            const score = game.addToScore(4, 'p1')
            expect(score).toBe(1200)
        })

        it('accumulates score across multiple calls', () => {
            const game = createTestGame()
            const player = createMockPlayer('p1')
            game.players.push(player)
            game.addToScore(1, 'p1') // 40
            const score = game.addToScore(2, 'p1') // +100
            expect(score).toBe(140)
        })
    })

    describe('countFilledLines', () => {
        it('returns 0 for an empty stack', () => {
            const game = createTestGame()
            const stack = createEmptyStack()
            expect(game.countFilledLines(stack)).toBe(0)
        })

        it('detects and clears a single filled line', () => {
            const game = createTestGame()
            const stack = createEmptyStack()

            // Fill the bottom row
            for (let x = 0; x < COLS; x++) {
                stack[(ROWS - 1) * COLS + x].isFilled = true
            }

            const count = game.countFilledLines(stack)
            expect(count).toBe(1)

            // Verify the line was cleared
            for (let x = 0; x < COLS; x++) {
                expect(stack[(ROWS - 1) * COLS + x].isFilled).toBe(false)
            }
        })

        it('detects multiple filled lines', () => {
            const game = createTestGame()
            const stack = createEmptyStack()

            // Fill the bottom 2 rows
            for (let row = ROWS - 2; row < ROWS; row++) {
                for (let x = 0; x < COLS; x++) {
                    stack[row * COLS + x].isFilled = true
                }
            }

            expect(game.countFilledLines(stack)).toBe(2)
        })

        it('does not clear partially filled lines', () => {
            const game = createTestGame()
            const stack = createEmptyStack()

            // Fill all but one tile in the bottom row
            for (let x = 0; x < COLS - 1; x++) {
                stack[(ROWS - 1) * COLS + x].isFilled = true
            }

            expect(game.countFilledLines(stack)).toBe(0)
        })

        it('moves upper lines down after clearing', () => {
            const game = createTestGame()
            const stack = createEmptyStack()

            // Place a single tile in row ROWS-2
            const color = { r: 255, g: 0, b: 0, a: 255 }
            stack[(ROWS - 2) * COLS + 3].isFilled = true
            stack[(ROWS - 2) * COLS + 3].color = color

            // Fill bottom row completely to trigger clear
            for (let x = 0; x < COLS; x++) {
                stack[(ROWS - 1) * COLS + x].isFilled = true
            }

            game.countFilledLines(stack)

            // The tile from ROWS-2 should have moved down to ROWS-1
            expect(stack[(ROWS - 1) * COLS + 3].isFilled).toBe(true)
            expect(stack[(ROWS - 1) * COLS + 3].color.r).toBe(255)
            // Original position should be empty
            expect(stack[(ROWS - 2) * COLS + 3].isFilled).toBe(false)
        })
    })

    describe('addToStack', () => {
        it('fills tiles at piece position', () => {
            const game = createTestGame()
            const stack = createEmptyStack()
            const piece = new Piece({ type: 'cube', color: { r: 100, g: 200, b: 50, a: 255 } })

            game.addToStack(piece, stack)

            // At least 4 tiles should be filled
            const filled = stack.filter(t => t.isFilled)
            expect(filled).toHaveLength(4)
        })

        it('sets the correct color on filled tiles', () => {
            const game = createTestGame()
            const stack = createEmptyStack()
            const color = { r: 100, g: 200, b: 50, a: 255 }
            const piece = new Piece({ type: 'cube', color })

            game.addToStack(piece, stack)

            const filled = stack.filter(t => t.isFilled)
            for (const tile of filled) {
                expect(tile.color.r).toBe(color.r)
                expect(tile.color.g).toBe(color.g)
                expect(tile.color.b).toBe(color.b)
            }
        })
    })

    describe('getRandomPieceProps', () => {
        it('returns a valid piece type', () => {
            const game = createTestGame()
            const validTypes = ['bar', 'left_L', 'right_L', 'cube', 'T', 'Z', 'rev_Z']
            const props = game.getRandomPieceProps()
            expect(validTypes).toContain(props.type)
        })

        it('returns a color with alpha', () => {
            const game = createTestGame()
            const props = game.getRandomPieceProps()
            expect(props.color.a).toBeDefined()
            expect(props.color.a).toBeGreaterThan(0)
        })
    })

    describe('player management', () => {
        it('getPlayerStack throws for unknown player', () => {
            const game = createTestGame()
            expect(() => game.getPlayerStack('unknown')).toThrow()
        })

        it('getPlayerScore throws for unknown player', () => {
            const game = createTestGame()
            expect(() => game.getPlayerScore('unknown')).toThrow()
        })

        it('getPlayerPieces throws for unknown player', () => {
            const game = createTestGame()
            expect(() => game.getPlayerPieces('unknown')).toThrow()
        })

        it('removePlayer removes the correct player', () => {
            const game = createTestGame()
            const p1 = createMockPlayer('p1')
            const p2 = createMockPlayer('p2')
            game.players.push(p1, p2)
            game.removePlayer('p1')
            expect(game.players).toHaveLength(1)
            expect(game.players[0].id).toBe('p2')
        })

        it('reset clears all players and resets state', () => {
            const game = createTestGame()
            game.players.push(createMockPlayer('p1'))
            game.isStarted = true
            game.reset()
            expect(game.players).toHaveLength(0)
            expect(game.isStarted).toBe(false)
        })
    })
})
