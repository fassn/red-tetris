/**
 * Token-bucket rate limiter keyed on persistent player IDs.
 * Buckets are evicted after STALE_MS of inactivity to prevent memory leaks.
 */
const STALE_MS = 5 * 60 * 1000 // 5 minutes

export class RateLimiter {
    private buckets = new Map<string, { tokens: number; lastRefill: number }>()
    private evictionTimer: ReturnType<typeof setInterval>

    constructor() {
        this.evictionTimer = setInterval(() => this.evictStale(), 60_000)
    }

    /**
     * Check if an event is allowed under its rate limit.
     * @param key   Unique key (e.g. playerId:category)
     * @param maxTokens   Max burst tokens
     * @param refillMs    Time in ms to fully refill the bucket
     */
    allow(key: string, maxTokens: number, refillMs: number): boolean {
        const now = Date.now()
        let bucket = this.buckets.get(key)

        if (!bucket) {
            bucket = { tokens: maxTokens - 1, lastRefill: now }
            this.buckets.set(key, bucket)
            return true
        }

        // Refill tokens based on elapsed time
        const elapsed = now - bucket.lastRefill
        const refillRate = maxTokens / refillMs
        bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * refillRate)
        bucket.lastRefill = now

        if (bucket.tokens >= 1) {
            bucket.tokens -= 1
            return true
        }

        return false
    }

    /** Remove buckets not accessed in the last STALE_MS. */
    private evictStale() {
        const now = Date.now()
        for (const [key, bucket] of this.buckets) {
            if (now - bucket.lastRefill > STALE_MS) {
                this.buckets.delete(key)
            }
        }
    }

    destroy() {
        clearInterval(this.evictionTimer)
        this.buckets.clear()
    }
}

const limiter = new RateLimiter()

// Rate limit configs: [maxBurst, refillWindowMs]
const LIMITS: Record<string, [number, number]> = {
    move:    [15, 1000],  // 15 moves per second burst
    chat:    [3, 3000],   // 3 messages per 3 seconds
    mode:    [2, 1000],   // 2 mode changes per second
}

/** Check rate limit keyed on a persistent ID (playerId). */
export function isRateLimited(id: string, category: string): boolean {
    const config = LIMITS[category]
    if (!config) return false
    return !limiter.allow(`${id}:${category}`, config[0], config[1])
}

export function destroyRateLimiter() {
    limiter.destroy()
}
