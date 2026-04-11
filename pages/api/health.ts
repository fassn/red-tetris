import type { NextApiRequest, NextApiResponse } from 'next'
import { getTopScores } from '../../server/stores/highscore-store'
import { GameMode } from '../../shared/types'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        getTopScores(GameMode.CLASSIC, 1)
        return res.status(200).json({ status: 'ok' })
    } catch {
        return res.status(503).json({ status: 'error', message: 'Database unreachable' })
    }
}
