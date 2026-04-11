import { describe, it, expect, beforeEach } from 'vitest'
import { RateLimiter, isRateLimited } from '../server/rate-limiter'

describe('RateLimiter', () => {
    let limiter: RateLimiter

    beforeEach(() => {
        limiter = new RateLimiter()
    })

    it('allows first request', () => {
        expect(limiter.allow('test', 5, 1000)).toBe(true)
    })

    it('allows requests up to burst limit', () => {
        for (let i = 0; i < 5; i++) {
            expect(limiter.allow('test', 5, 1000)).toBe(true)
        }
    })

    it('blocks requests after burst limit exhausted', () => {
        for (let i = 0; i < 5; i++) {
            limiter.allow('test', 5, 1000)
        }
        expect(limiter.allow('test', 5, 1000)).toBe(false)
    })

    it('tracks different keys independently', () => {
        for (let i = 0; i < 5; i++) {
            limiter.allow('key-a', 5, 1000)
        }
        expect(limiter.allow('key-a', 5, 1000)).toBe(false)
        expect(limiter.allow('key-b', 5, 1000)).toBe(true)
    })

    it('destroy clears all state', () => {
        limiter.allow('test', 5, 1000)
        limiter.destroy()
        // After destroy, new calls still work (fresh bucket)
        expect(limiter.allow('test', 5, 1000)).toBe(true)
    })
})

describe('isRateLimited', () => {
    it('is not rate limited on first call', () => {
        expect(isRateLimited('player1', 'move')).toBe(false)
    })

    it('returns false for unknown category', () => {
        expect(isRateLimited('player1', 'unknown')).toBe(false)
    })

    it('rate limits persist across calls with same id', () => {
        // Exhaust the move bucket (15 burst)
        for (let i = 0; i < 15; i++) {
            isRateLimited('player1', 'move')
        }
        expect(isRateLimited('player1', 'move')).toBe(true)
    })
})
