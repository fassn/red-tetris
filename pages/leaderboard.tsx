import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Footer from '../components/footer'
import { GameMode } from '../shared/types'
import type { HighscoreEntry } from '../server/stores/highscore-store'

const tabs = [
    { mode: GameMode.CLASSIC, label: '🏆 Classic' },
    { mode: GameMode.TIME_ATTACK, label: '⏱ Time Attack' },
] as const

function formatDate(iso: string): string {
    return new Date(iso + 'Z').toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
    })
}

const Leaderboard = () => {
    const [activeMode, setActiveMode] = useState<GameMode>(GameMode.CLASSIC)
    const [result, setResult] = useState<{ mode: GameMode; scores: HighscoreEntry[] } | null>(null)

    useEffect(() => {
        let cancelled = false
        fetch(`/api/highscores?mode=${activeMode}`)
            .then((res) => res.json())
            .then((data) => {
                if (!cancelled) setResult({ mode: activeMode, scores: data.scores ?? [] })
            })
            .catch(() => {
                if (!cancelled) setResult({ mode: activeMode, scores: [] })
            })
        return () => { cancelled = true }
    }, [activeMode])

    const loading = !result || result.mode !== activeMode
    const scores = result?.scores ?? []

    return (
        <div className='h-dvh flex flex-col overflow-hidden'>
            <Head>
                <title>Leaderboard — Red Tetris</title>
                <meta name='description' content='Red Tetris high scores' />
            </Head>

            <header className='flex items-center justify-between bg-brand px-4 h-10 shrink-0'>
                <Link href='/' className='text-sm font-medium hover:underline'>
                    ← Back to game
                </Link>
                <h1 className='text-lg font-bold uppercase tracking-wider'>Leaderboard</h1>
                <div className='w-20' />
            </header>

            <main className='flex-1 min-h-0 flex flex-col items-center px-4 py-8 overflow-y-auto'>
                {/* Tabs */}
                <div className='flex gap-1 bg-surface-card rounded-lg p-1 shadow-sm border border-edge mb-8' role='tablist' aria-label='Game mode'>
                    {tabs.map(({ mode, label }) => (
                        <button
                            key={mode}
                            role='tab'
                            aria-selected={activeMode === mode}
                            onClick={() => setActiveMode(mode)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand ${
                                activeMode === mode
                                    ? 'bg-brand text-white shadow-sm'
                                    : 'text-content-muted hover:text-content'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className='w-full max-w-lg bg-surface-card rounded-lg shadow-sm border border-edge overflow-hidden'>
                    <table className='w-full text-sm'>
                        <caption className='sr-only'>
                            {activeMode === GameMode.CLASSIC ? 'Classic' : 'Time Attack'} mode high scores
                        </caption>
                        <thead>
                            <tr className='border-b border-edge bg-surface-input'>
                                <th scope='col' className='px-4 py-3 text-left font-semibold w-12'>#</th>
                                <th scope='col' className='px-4 py-3 text-left font-semibold'>Player</th>
                                <th scope='col' className='px-4 py-3 text-right font-semibold'>Score</th>
                                <th scope='col' className='px-4 py-3 text-right font-semibold hidden sm:table-cell'>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className='px-4 py-8 text-center text-content-muted'>Loading…</td></tr>
                            ) : scores.length === 0 ? (
                                <tr><td colSpan={4} className='px-4 py-8 text-center text-content-muted'>No scores yet. Be the first!</td></tr>
                            ) : (
                                scores.map((entry, i) => (
                                    <tr key={entry.id} className={`border-b border-edge last:border-0 ${i < 3 ? 'font-medium' : ''}`}>
                                        <td className='px-4 py-3'>
                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                        </td>
                                        <td className='px-4 py-3'>{entry.playerName}</td>
                                        <td className='px-4 py-3 text-right tabular-nums'>{entry.score.toLocaleString()}</td>
                                        <td className='px-4 py-3 text-right text-content-muted hidden sm:table-cell'>{formatDate(entry.createdAt)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            <Footer />
        </div>
    )
}

export default Leaderboard
