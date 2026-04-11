import type { NextPage } from 'next'
import Head from 'next/head'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

import Chat from '../components/chat'
import ConnectionOverlay from '../components/connection-overlay'
import { socket } from '../context/socket'

import Lobby from "../components/lobby"
import Welcome from "../components/welcome"
import Footer from "../components/footer"
import GameClient from "../components/game-client"
import { useConnectionStatus } from '../hooks/use-connection-status'
import { PlayerState, PlayState, RoomPlayer, Stack, GameMode } from '../shared/types'
import { BOARDHEIGHT } from '../shared/config'

export type OpponentBoard = {
    playerId: string
    playerName: string
    stack: Stack[]
}

function parseHash(url: string) {
    const hash = url.split('#')[1] || ''
    const separatorIndex = hash.indexOf('/')
    if (separatorIndex === -1) return {}
    const room = decodeURIComponent(hash.slice(0, separatorIndex))
    const playerName = decodeURIComponent(hash.slice(separatorIndex + 1))
    if (!room || !playerName) return {}
    return { room, playerName }
}

function connectSocket(roomName: string, playerName: string) {
    const sessionId = localStorage.getItem('sessionId')
    socket.auth = sessionId
        ? { sessionId, playerName, roomName }
        : { playerName, roomName }
    socket.connect()
}

const Home: NextPage = () => {
    const router = useRouter()
    const { status: connectionStatus, error: connectionError, markConnecting } = useConnectionStatus()

    const [playerName, setPlayerName] = useState('')
    const [isLobby, setIsLobby] = useState(false)
    const [playerState, setPlayerState] = useState<PlayerState>({ host: false, playState: PlayState.WAITING })
    const [otherPlayers, setOtherPlayers] = useState<RoomPlayer[]>([])
    const [opponentBoards, setOpponentBoards] = useState<Map<string, OpponentBoard>>(new Map())
    const [gameMode, setGameMode] = useState<GameMode>(GameMode.CLASSIC)
    const [timeRemaining, setTimeRemaining] = useState(-1)
    const isInGame = playerState.playState === PlayState.PLAYING || playerState.playState === PlayState.ENDGAME

    useEffect(() => {
        // URL hash is unavailable during SSR, so initial state must be set in an effect
        const { room, playerName: name } = parseHash(router.asPath)
        if (room && name) {
            setPlayerName(name)
            setIsLobby(true)
            markConnecting()
            connectSocket(room, name)
        }

        const handleHashChange = (url: string) => {
            const { room, playerName: name } = parseHash(url)
            if (room && name) {
                setPlayerName(name)
                setIsLobby(true)
                markConnecting()
                connectSocket(room, name)
            }
        }

        const handleRoomFull = () => {
            router.push('/?error=roomIsFull')
            setIsLobby(false)
        }

        const handleSession = ({ sessionId, playerId }: { sessionId: string, playerId: string }) => {
            socket.auth = { sessionId }
            localStorage.setItem('sessionId', sessionId)
            socket.playerId = playerId
        }

        const handleNewState = ({ playerState, otherPlayers }: { playerState?: PlayerState, otherPlayers?: RoomPlayer[] }) => {
            if (playerState) {
                setPlayerState(playerState)
                // Clear opponent boards and timer when returning to lobby
                if (playerState.playState === PlayState.WAITING) {
                    setOpponentBoards(new Map())
                    setTimeRemaining(-1)
                }
            }
            if (otherPlayers) {
                setOtherPlayers(otherPlayers)
            }
        }

        const handleOpponentStack = ({ playerId, playerName, stack }: { playerId: string; playerName: string; stack: Stack[] }) => {
            setOpponentBoards((prev) => {
                const next = new Map(prev)
                next.set(playerId, { playerId, playerName, stack })
                return next
            })
        }

        const handleTimeUpdate = ({ remaining }: { remaining: number }) => {
            setTimeRemaining(remaining)
        }

        const handleGameModeChanged = ({ gameMode }: { gameMode: GameMode }) => {
            setGameMode(gameMode)
        }

        router.events.on('hashChangeComplete', handleHashChange)
        socket.on('roomIsFull', handleRoomFull)
        socket.on('session', handleSession)
        socket.on('newState', handleNewState)
        socket.on('opponentStack', handleOpponentStack)
        socket.on('timeUpdate', handleTimeUpdate)
        socket.on('gameModeChanged', handleGameModeChanged)

        return () => {
            router.events.off('hashChangeComplete', handleHashChange)
            socket.off('roomIsFull', handleRoomFull)
            socket.off('session', handleSession)
            socket.off('newState', handleNewState)
            socket.off('opponentStack', handleOpponentStack)
            socket.off('timeUpdate', handleTimeUpdate)
            socket.off('gameModeChanged', handleGameModeChanged)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

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
                <main id='main-content' className='flex-1 min-h-0 flex flex-col px-4 sm:px-8' aria-label='Game room'>
                    <div className='flex flex-col items-center justify-center sm:flex-row sm:items-start gap-4 sm:gap-6 py-2 sm:py-12 flex-1 min-h-0'>
                        <div className={`flex flex-col gap-4 w-full max-w-sm sm:w-80 xl:w-96${isInGame ? ' hidden lg:flex' : ''}`} style={{ maxHeight: BOARDHEIGHT }}>
                            <section aria-label='Lobby'>
                                <Lobby playerState={playerState} otherPlayers={otherPlayers} gameMode={gameMode} />
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
                :
                <Welcome />
            }

            <Footer />
        </div>
    )
}

export default Home
