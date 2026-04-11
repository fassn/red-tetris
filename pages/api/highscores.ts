import type { NextApiRequest, NextApiResponse } from 'next'
import { getTopScores, HighscoreEntry } from '../../server/stores/highscore-store'
import { GameMode } from '../../shared/types'

type ResponseData = { scores: HighscoreEntry[] } | { error: string }

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const mode = req.query.mode as string
    if (mode !== GameMode.CLASSIC && mode !== GameMode.TIME_ATTACK) {
        return res.status(400).json({ error: 'Invalid mode. Use CLASSIC or TIME_ATTACK.' })
    }

    const scores = getTopScores(mode)
    return res.status(200).json({ scores })
}
