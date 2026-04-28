import type { NextPage } from 'next'
import Head from 'next/head'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'

import Chat from '../../components/chat'
import ConnectionOverlay from '../../components/connection-overlay'
import NamePrompt from '../../components/name-prompt'
import Lobby from '../../components/lobby'
import Footer from '../../components/footer'
import { useGameState } from '../../hooks/use-game-state'
import { isValidName } from '../../shared/validation'

const GameClient = dynamic(() => import('../../components/game-client'), { ssr: false })

const RoomPage: NextPage = () => {
    const router = useRouter()

    if (!router.isReady) return null

    const params = router.query.params as string[] | undefined
    if (!params?.length) {
        router.replace('/')
        return null
    }

    const roomName = decodeURIComponent(params[0])
    if (!isValidName(roomName) || params.length > 2 || (params.length === 2 && params[1] !== 'playing')) {
        router.replace('/')
        return null
    }

    return <RoomView roomName={roomName} />
}

function RoomView({ roomName }: { roomName: string }) {
    const {
        playerName,
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
        needsPlayerName,
        submitPlayerName,
        cancelNamePrompt,
    } = useGameState(roomName)

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
                <title>{roomName} – Red Tetris</title>
                <meta name="description" content="A Typescript Implementation of Tetris" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <a href='#main-content' className='sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-surface-card focus:px-4 focus:py-2 focus:rounded-sm focus:shadow-xs'>
                Skip to content
            </a>
            <ConnectionOverlay status={connectionStatus} error={connectionError} />
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
            <main id='main-content' className='flex-1 min-h-0 flex flex-col' aria-label='Game room'>
                {/* LOBBY: centered single column, all breakpoints */}
                {!isInGame && (
                    <div className='flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 py-6'>
                        <div className='w-full max-w-xl flex flex-col gap-4'>
                            <section aria-label='Lobby'>
                                <Lobby playerName={playerName} playerState={playerState} otherPlayers={otherPlayers} gameMode={gameMode} onToggleMode={setGameMode} />
                            </section>
                            <section className='flex flex-col h-40 lg:h-64 min-h-0' aria-label='Chat'>
                                <Chat playerName={playerName} />
                            </section>
                        </div>
                    </div>
                )}
                {/* GAME: always mounted, shown only while playing */}
                <section
                    className={`${isInGame ? 'flex-1 min-h-0' : 'hidden'} p-2 sm:p-4 lg:p-6`}
                    aria-label='Game'
                >
                    <GameClient playerState={playerState} opponentBoards={opponentBoards} otherPlayers={otherPlayers} gameMode={gameMode} timeRemaining={timeRemaining} bottomSlot={isInGame ? <Chat playerName={playerName} /> : undefined} />
                </section>
            </main>

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

        {needsPlayerName && (
            <NamePrompt
                roomName={roomName}
                onSubmit={submitPlayerName}
                onCancel={cancelNamePrompt}
            />
        )}
        </>
    )
}

export default RoomPage
