import { describe, it, expect, beforeEach } from 'vitest'
import { RateLimiter, isRateLimited, cleanupRateLimits } from '../server/rate-limiter'

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

    it('cleans up keys by prefix', () => {
        limiter.allow('socket1:move', 5, 1000)
        limiter.allow('socket1:chat', 5, 1000)
        limiter.allow('socket2:move', 5, 1000)
        limiter.cleanup('socket1')
        // After cleanup, socket1 keys are fresh (allowed)
        expect(limiter.allow('socket1:move', 1, 1000)).toBe(true)
    })
})

describe('isRateLimited / cleanupRateLimits', () => {
    it('is not rate limited on first call', () => {
        expect(isRateLimited('sock1', 'move')).toBe(false)
    })

    it('returns false for unknown category', () => {
        expect(isRateLimited('sock1', 'unknown')).toBe(false)
    })

    it('cleanupRateLimits does not throw', () => {
        expect(() => cleanupRateLimits('sock1')).not.toThrow()
    })
})
