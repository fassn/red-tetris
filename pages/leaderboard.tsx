import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Footer from '../components/footer'
import Navbar from '../components/navbar'
import { GameMode } from '../shared/types'
import type { HighscoreEntry } from '../server/stores/highscore-store'

const tabs = [
    { mode: GameMode.CLASSIC, label: '🏆 Classic' },
    { mode: GameMode.TIME_ATTACK, label: '⏱ Time Attack' },
] as const

const playerCounts = [1, 2, 3, 4] as const
type PlayerCount = typeof playerCounts[number]

function formatDate(iso: string): string {
    return new Date(iso + 'Z').toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
    })
}

const Leaderboard = () => {
    const [activeMode, setActiveMode] = useState<GameMode>(GameMode.CLASSIC)
    const [activeCount, setActiveCount] = useState<PlayerCount>(1)
    const [result, setResult] = useState<{ mode: GameMode; playerCount: PlayerCount; scores: HighscoreEntry[] } | null>(null)
    const [fetchError, setFetchError] = useState<string | null>(null)

    const switchMode = (mode: GameMode) => {
        setFetchError(null)
        setActiveMode(mode)
    }

    const switchCount = (count: PlayerCount) => {
        setFetchError(null)
        setActiveCount(count)
    }

    useEffect(() => {
        let cancelled = false
        fetch(`/api/highscores?mode=${activeMode}&playerCount=${activeCount}`)
            .then((res) => res.json())
            .then((data) => {
                if (!cancelled) setResult({ mode: activeMode, playerCount: activeCount, scores: data.scores ?? [] })
            })
            .catch(() => {
                if (!cancelled) {
                    setFetchError('Failed to load leaderboard. Please try again later.')
                    setResult({ mode: activeMode, playerCount: activeCount, scores: [] })
                }
            })
        return () => { cancelled = true }
    }, [activeMode, activeCount])

    const loading = !result || result.mode !== activeMode || result.playerCount !== activeCount
    const scores = result?.scores ?? []

    return (
        <div className='h-dvh flex flex-col overflow-hidden'>
            <Head>
                <title>Leaderboard — Red Tetris</title>
                <meta name='description' content='Red Tetris high scores' />
            </Head>

            <Navbar
                title='Leaderboard'
                left={<Link href='/' className='text-sm font-medium hover:underline'>← Back to game</Link>}
            />

            <main className='flex-1 min-h-0 flex flex-col items-center px-4 py-8 overflow-y-auto'>
                {/* Mode tabs */}
                <div className='flex gap-1 bg-surface-card rounded-lg p-1 shadow-xs border border-edge mb-3' role='tablist' aria-label='Game mode'>
                    {tabs.map(({ mode, label }) => (
                        <button
                            key={mode}
                            role='tab'
                            aria-selected={activeMode === mode}
                            onClick={() => switchMode(mode)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-brand ${
                                activeMode === mode
                                    ? 'bg-brand text-white shadow-xs'
                                    : 'text-content-muted hover:text-content'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Player count sub-tabs */}
                <div className='flex gap-1 bg-surface-card rounded-lg p-1 shadow-xs border border-edge mb-8' role='tablist' aria-label='Number of players'>
                    {playerCounts.map(count => (
                        <button
                            key={count}
                            role='tab'
                            aria-selected={activeCount === count}
                            onClick={() => switchCount(count)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-brand ${
                                activeCount === count
                                    ? 'bg-brand text-white shadow-xs'
                                    : 'text-content-muted hover:text-content'
                            }`}
                        >
                            {count}P
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className='w-full max-w-lg bg-surface-card rounded-lg shadow-xs border border-edge overflow-hidden'>
                    <table className='w-full text-sm'>
                        <caption className='sr-only'>
                            {activeMode === GameMode.CLASSIC ? 'Classic' : 'Time Attack'} mode {activeCount}-player high scores
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
                            {fetchError ? (
                                <tr><td colSpan={4} className='px-4 py-8 text-center text-status-danger'>{fetchError}</td></tr>
                            ) : loading ? (
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
