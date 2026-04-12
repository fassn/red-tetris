import type { NextPage } from 'next'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'

import Chat from '../components/chat'
import ConnectionOverlay from '../components/connection-overlay'

import Lobby from "../components/lobby"
import Welcome from "../components/welcome"
import Footer from "../components/footer"
import { useGameState } from '../hooks/use-game-state'
import { Stack } from '../shared/types'
import { BOARDHEIGHT } from '../shared/config'

const GameClient = dynamic(() => import('../components/game-client'), { ssr: false })

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
        backNavigationPending,
        cancelBackNavigation,
    } = useGameState()

    const [showForfeitDialog, setShowForfeitDialog] = useState(false)
    const forfeitDialogVisible = showForfeitDialog || backNavigationPending
    const mainContentRef = useRef<HTMLDivElement>(null)
    const dialogRef = useRef<HTMLDivElement>(null)
    const forfeitTriggerRef = useRef<HTMLElement | null>(null)

    const closeForfeitDialog = useCallback(() => {
        setShowForfeitDialog(false)
        cancelBackNavigation()
        requestAnimationFrame(() => forfeitTriggerRef.current?.focus())
    }, [cancelBackNavigation])

    // Toggle inert on main content when forfeit dialog is shown
    useEffect(() => {
        const el = mainContentRef.current
        if (!el) return
        if (forfeitDialogVisible) {
            el.setAttribute('inert', '')
            el.setAttribute('aria-hidden', 'true')
        } else {
            el.removeAttribute('inert')
            el.removeAttribute('aria-hidden')
        }
    }, [forfeitDialogVisible])

    // Focus trap + Escape handling for forfeit dialog
    useEffect(() => {
        if (!forfeitDialogVisible) return
        const dialog = dialogRef.current
        if (!dialog) return
        const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

        // Verify initial focus landed inside the dialog (fallback for autoFocus)
        if (!dialog.contains(document.activeElement)) {
            const first = dialog.querySelector<HTMLElement>(focusableSelector)
            first?.focus()
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeForfeitDialog()
                return
            }
            if (e.key !== 'Tab') return
            const focusable = dialog.querySelectorAll<HTMLElement>(focusableSelector)
            if (focusable.length === 0) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault()
                last.focus()
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault()
                first.focus()
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [forfeitDialogVisible, closeForfeitDialog])

    const handleHeaderAction = () => {
        if (isInGame) {
            forfeitTriggerRef.current = document.activeElement as HTMLElement
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
        <>
        <div ref={mainContentRef} className='h-dvh flex flex-col overflow-hidden'>
            <Head>
                <title>Red Tetris</title>
                <meta name="description" content="A Typescript Implementation of Tetris" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <a href='#main-content' className='sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-surface-card focus:px-4 focus:py-2 focus:rounded-sm focus:shadow-xs'>
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
                        <div className={`flex flex-col gap-4 w-full max-w-sm sm:w-80 xl:w-96 ${isInGame ? 'hidden lg:flex' : ''}`} style={{ maxHeight: BOARDHEIGHT }}>
                            <section aria-label='Lobby'>
                                <Lobby playerState={playerState} otherPlayers={otherPlayers} gameMode={gameMode} onToggleMode={setGameMode} />
                            </section>
                            <section className='flex-1 min-h-0 flex flex-col' aria-label='Chat'>
                                <Chat playerName={playerName} />
                            </section>
                        </div>
                        <section className={`w-full sm:w-auto min-h-0 flex-1 sm:flex-initial ${isInGame ? '' : 'hidden sm:block'}`} aria-label='Game'>
                            <GameClient playerState={playerState} opponentBoards={opponentBoards} otherPlayers={otherPlayers} gameMode={gameMode} timeRemaining={timeRemaining} />
                        </section>
                    </div>
                </main>
                </>
                :
                <Welcome />
            }

            <Footer />
        </div>

        {forfeitDialogVisible && (
            <div
                ref={dialogRef}
                className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
                role='alertdialog'
                aria-modal='true'
                aria-labelledby='forfeit-title'
                aria-describedby='forfeit-desc'
                onClick={closeForfeitDialog}
            >
                <div className='bg-surface-card rounded-lg shadow-lg p-6 max-w-sm mx-4' onClick={(e) => e.stopPropagation()}>
                    <h2 id='forfeit-title' className='text-lg font-semibold mb-2'>Forfeit Game?</h2>
                    <p id='forfeit-desc' className='text-content-secondary text-sm mb-6'>
                        Are you sure you want to forfeit? This will count as a loss and you won&apos;t be eligible for the leaderboard.
                    </p>
                    <div className='flex gap-3 justify-end'>
                        <button
                            onClick={closeForfeitDialog}
                            className='px-4 py-2 text-sm font-medium rounded-sm border border-edge hover:bg-surface-input transition-colors'
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmForfeit}
                            className='px-4 py-2 text-sm font-semibold rounded-sm bg-status-danger text-white hover:opacity-90 transition-opacity'
                            autoFocus
                        >
                            Forfeit
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}

export default Home
