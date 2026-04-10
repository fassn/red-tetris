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
import { PlayerState, PlayState, RoomPlayer } from '../shared/types'

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
            }
            if (otherPlayers) {
                setOtherPlayers(otherPlayers)
            }
        }

        router.events.on('hashChangeComplete', handleHashChange)
        socket.on('roomIsFull', handleRoomFull)
        socket.on('session', handleSession)
        socket.on('newState', handleNewState)

        return () => {
            router.events.off('hashChangeComplete', handleHashChange)
            socket.off('roomIsFull', handleRoomFull)
            socket.off('session', handleSession)
            socket.off('newState', handleNewState)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <div>
            <Head>
                <title>Red Tetris</title>
                <meta name="description" content="A Typescript Implementation of Tetris" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            {isLobby && (
                <ConnectionOverlay status={connectionStatus} error={connectionError} />
            )}
            {
                isLobby ?
                <main className='min-h-screen px-4 pb-24 lg:px-8'>
                    <div className='flex flex-col items-center lg:flex-row lg:items-start lg:justify-center gap-6 py-8 lg:py-20'>
                        <div className='flex flex-shrink-0 flex-col w-full max-w-sm lg:w-80 xl:w-96 lg:place-content-between order-2 lg:order-1'>
                            <Lobby playerState={playerState} otherPlayers={otherPlayers} />
                        </div>
                        <div className='order-1 lg:order-2'>
                            <GameClient playerState={playerState} />
                        </div>
                        <div className='flex flex-col w-full max-w-sm lg:w-72 xl:w-80 order-3'>
                            <Chat playerName={playerName} />
                        </div>
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
