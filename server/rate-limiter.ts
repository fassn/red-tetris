/** Per-socket event rate limiter using a token-bucket approach. */
export class RateLimiter {
    private buckets = new Map<string, { tokens: number; lastRefill: number }>()

    /**
     * Check if an event is allowed under its rate limit.
     * @param key   Unique key (e.g. socketId + eventName)
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

    /** Remove all buckets for a given socket (call on disconnect). */
    cleanup(socketId: string) {
        for (const key of this.buckets.keys()) {
            if (key.startsWith(socketId)) {
                this.buckets.delete(key)
            }
        }
    }
}

const limiter = new RateLimiter()

// Rate limit configs: [maxBurst, refillWindowMs]
const LIMITS: Record<string, [number, number]> = {
    move:    [15, 1000],  // 15 moves per second burst
    chat:    [3, 3000],   // 3 messages per 3 seconds
    mode:    [2, 1000],   // 2 mode changes per second
}

export function isRateLimited(socketId: string, category: string): boolean {
    const config = LIMITS[category]
    if (!config) return false
    return !limiter.allow(`${socketId}:${category}`, config[0], config[1])
}

export function cleanupRateLimits(socketId: string) {
    limiter.cleanup(socketId)
}
