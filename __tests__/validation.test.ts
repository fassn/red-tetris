import { describe, it, expect } from 'vitest'
import { isValidName, isValidMessage, isValidGameMode } from '../server/validation'
import { GameMode } from '../shared/types'

describe('Validation', () => {
    describe('isValidName', () => {
        it('accepts valid alphanumeric names', () => {
            expect(isValidName('player1')).toBe(true)
            expect(isValidName('Room-1')).toBe(true)
            expect(isValidName('test_name')).toBe(true)
        })

        it('rejects empty string', () => {
            expect(isValidName('')).toBe(false)
        })

        it('rejects non-string types', () => {
            expect(isValidName(null)).toBe(false)
            expect(isValidName(undefined)).toBe(false)
            expect(isValidName(42)).toBe(false)
        })

        it('rejects names with special characters', () => {
            expect(isValidName('player<script>')).toBe(false)
            expect(isValidName('name with spaces')).toBe(false)
            expect(isValidName('name/path')).toBe(false)
        })

        it('rejects names longer than 32 characters', () => {
            expect(isValidName('a'.repeat(32))).toBe(true)
            expect(isValidName('a'.repeat(33))).toBe(false)
        })
    })

    describe('isValidMessage', () => {
        it('accepts valid messages', () => {
            expect(isValidMessage('Hello world!')).toBe(true)
        })

        it('rejects empty string', () => {
            expect(isValidMessage('')).toBe(false)
        })

        it('rejects non-string types', () => {
            expect(isValidMessage(null)).toBe(false)
            expect(isValidMessage(undefined)).toBe(false)
        })

        it('rejects messages longer than 500 characters', () => {
            expect(isValidMessage('x'.repeat(500))).toBe(true)
            expect(isValidMessage('x'.repeat(501))).toBe(false)
        })
    })

    describe('isValidGameMode', () => {
        it('accepts valid game modes', () => {
            expect(isValidGameMode(GameMode.CLASSIC)).toBe(true)
            expect(isValidGameMode(GameMode.TIME_ATTACK)).toBe(true)
        })

        it('rejects invalid game modes', () => {
            expect(isValidGameMode('INVALID')).toBe(false)
            expect(isValidGameMode(null)).toBe(false)
            expect(isValidGameMode(42)).toBe(false)
        })
    })
})
