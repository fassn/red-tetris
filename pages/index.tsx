import type { NextPage } from 'next'
import Head from 'next/head'
import { useCallback, useEffect, useState } from 'react'

import Chat from '../components/chat'
import ConnectionOverlay from '../components/connection-overlay'

import Lobby from "../components/lobby"
import Welcome from "../components/welcome"
import Footer from "../components/footer"
import GameClient from "../components/game-client"
import { useGameState } from '../hooks/use-game-state'
import { Stack } from '../shared/types'
import { BOARDHEIGHT } from '../shared/config'

export type OpponentBoard = {
    playerId: string
    playerName: string
    stack: Stack[]
}

export type OpponentBoards = Record<string, OpponentBoard>

const Home: NextPage = () => {
    const {
        playerName,
        isLobby,
        isInGame,
        playerState,
        otherPlayers,
        opponentBoards,
        gameMode,
        setGameMode,
        timeRemaining,
        connectionStatus,
        connectionError,
        navigateHome,
        forfeitGame,
    } = useGameState()

    const [showForfeitDialog, setShowForfeitDialog] = useState(false)

    const closeForfeitDialog = useCallback(() => setShowForfeitDialog(false), [])

    // Close forfeit dialog on Escape
    useEffect(() => {
        if (!showForfeitDialog) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeForfeitDialog()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [showForfeitDialog, closeForfeitDialog])

    const handleHeaderAction = () => {
        if (isInGame) {
            setShowForfeitDialog(true)
        } else {
            navigateHome()
        }
    }

    const confirmForfeit = () => {
        setShowForfeitDialog(false)
        forfeitGame()
    }

    return (
        <div className='h-dvh flex flex-col overflow-hidden'>
            <Head>
                <title>Red Tetris</title>
                <meta name="description" content="A Typescript Implementation of Tetris" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <a href='#main-content' className='sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-surface-card focus:px-4 focus:py-2 focus:rounded focus:shadow'>
                Skip to content
            </a>
            {isLobby && (
                <ConnectionOverlay status={connectionStatus} error={connectionError} />
            )}
            {
                isLobby ?
                <>
                <header className='flex items-center justify-between bg-brand px-4 h-10 shrink-0'>
                    <button
                        onClick={handleHeaderAction}
                        className='text-sm font-medium hover:underline'
                    >
                        {isInGame ? '← Lobby' : '← Home'}
                    </button>
                    <h1 className='text-lg font-bold uppercase tracking-wider'>Red Tetris</h1>
                    <div className='w-16' />
                </header>
                <main id='main-content' className='flex-1 min-h-0 flex flex-col px-4 sm:px-8' aria-label='Game room'>
                    <div className='flex flex-col items-center justify-center sm:flex-row sm:items-start gap-4 sm:gap-6 py-2 sm:py-12 flex-1 min-h-0'>
                        <div className={`flex flex-col gap-4 w-full max-w-sm sm:w-80 xl:w-96${isInGame ? ' hidden lg:flex' : ''}`} style={{ maxHeight: BOARDHEIGHT }}>
                            <section aria-label='Lobby'>
                                <Lobby playerState={playerState} otherPlayers={otherPlayers} gameMode={gameMode} onToggleMode={setGameMode} />
                            </section>
                            <section className='flex-1 min-h-0 flex flex-col' aria-label='Chat'>
                                <Chat playerName={playerName} />
                            </section>
                        </div>
                        <section className={`w-full sm:w-auto min-h-0 flex-1 sm:flex-initial${isInGame ? '' : ' hidden sm:block'}`} aria-label='Game'>
                            <GameClient playerState={playerState} opponentBoards={opponentBoards} otherPlayers={otherPlayers} gameMode={gameMode} timeRemaining={timeRemaining} />
                        </section>
                    </div>
                </main>
                </>
                :
                <Welcome />
            }

            <Footer />

            {showForfeitDialog && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50' role='dialog' aria-modal='true' aria-label='Forfeit confirmation' onClick={closeForfeitDialog}>
                    <div className='bg-surface-card rounded-lg shadow-lg p-6 max-w-sm mx-4' onClick={(e) => e.stopPropagation()}>
                        <h2 className='text-lg font-semibold mb-2'>Forfeit Game?</h2>
                        <p className='text-content-secondary text-sm mb-6'>
                            Are you sure you want to forfeit? This will count as a loss and you won&apos;t be eligible for the leaderboard.
                        </p>
                        <div className='flex gap-3 justify-end'>
                            <button
                                onClick={closeForfeitDialog}
                                className='px-4 py-2 text-sm font-medium rounded border border-edge hover:bg-surface-input transition-colors'
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmForfeit}
                                className='px-4 py-2 text-sm font-semibold rounded bg-status-danger text-white hover:opacity-90 transition-opacity'
                                autoFocus
                            >
                                Forfeit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Home
