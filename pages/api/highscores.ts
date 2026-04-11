import type { NextApiRequest, NextApiResponse } from 'next'
import { getTopScores, HighscoreEntry } from '../../server/stores/highscore-store'
import { GameMode } from '../../shared/types'

type ResponseData = { scores: HighscoreEntry[] } | { error: string }

const RATE_WINDOW_MS = 60_000
const MAX_REQUESTS = 30
const CLEANUP_INTERVAL_MS = 5 * 60_000
const hits = new Map<string, { count: number; resetAt: number }>()

// Periodically evict expired entries to prevent unbounded growth
const cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [ip, entry] of hits) {
        if (now > entry.resetAt) hits.delete(ip)
    }
}, CLEANUP_INTERVAL_MS)
cleanupTimer.unref()

function isRateLimited(ip: string): boolean {
    const now = Date.now()
    const entry = hits.get(ip)
    if (!entry || now > entry.resetAt) {
        hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
        return false
    }
    entry.count++
    return entry.count > MAX_REQUESTS
}

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
    if (isRateLimited(ip)) {
        return res.status(429).json({ error: 'Too many requests' })
    }

    const mode = req.query.mode as string
    if (mode !== GameMode.CLASSIC && mode !== GameMode.TIME_ATTACK) {
        return res.status(400).json({ error: 'Invalid mode. Use CLASSIC or TIME_ATTACK.' })
    }

    const scores = getTopScores(mode)
    return res.status(200).json({ scores })
}
