import type { NextPage } from 'next'
import Head from 'next/head'
import { useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/router'

import Chat from '../components/chat'
import { SocketContext } from '../context/socket'

import Lobby from "../components/lobby"
import Welcome from "../components/welcome"
import Footer from "../components/footer"
import GameClient from "../components/game-client"
import { PlayerState, PlayState } from '../utils/types'

const Home: NextPage = () => {
    const socket = useContext(SocketContext)
    const router = useRouter()

    const [playerName, setPlayerName] = useState('')
    const [isLobby, setIsLobby] = useState(false)
    const [playerState, setPlayerState] = useState<PlayerState>({ host: false, playState: PlayState.WAITING })
    const [otherPlayerState, setOtherPlayerState] = useState<PlayerState>({ host: false, playState: PlayState.WAITING })

    useEffect(() => {
        // direct URL connection
        handleParams(router.asPath)

        // after form submit
        const handleHashChange = (url: string) => {
            handleParams(url)
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

        const handleNewState = ({ playerState, otherPlayerState }: { playerState?: PlayerState, otherPlayerState?: PlayerState }) => {
            if (playerState) {
                setPlayerState(playerState)
            }
            if (otherPlayerState) {
                setOtherPlayerState(otherPlayerState)
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
    }, [])

    const parseHash = (url: string) => {
        const hash = url.split('#')[1] || ''
        const separatorIndex = hash.indexOf('/')
        if (separatorIndex === -1) return {}
        const room = decodeURIComponent(hash.slice(0, separatorIndex))
        const playerName = decodeURIComponent(hash.slice(separatorIndex + 1))
        if (!room || !playerName) return {}
        return { room, playerName }
    }

    const handleParams = (url: string) => {
        const { room, playerName } = parseHash(url)
        if (room && playerName) {
            setPlayerName(playerName)
            setIsLobby(true)
            connectSocketClient(room, playerName)
        }
    }

    const connectSocketClient = (roomName: string, playerName: string) => {
        const sessionId = localStorage.getItem('sessionId')
        socket.auth = { playerName, roomName }
        if (sessionId) {
            socket.auth = { sessionId, playerName, roomName }
        }
        socket.connect()
    }

    return (
        <div>
            <Head>
                <title>Red Tetris</title>
                <meta name="description" content="A Typescript Implementation of Tetris" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            {
                isLobby ?
                <main className='h-screen px-8'>
                    <div className='flex py-20'>
                        <div className='flex flex-shrink-0 flex-col w-96 place-content-between'>
                            <Lobby playerState={playerState} otherPlayerState={otherPlayerState} />
                        </div>
                        <GameClient playerState={playerState}
                        />
                        <div className='flex w-auto justify-end'>
                            <div className='border-l border-2 border-red-500 mr-24'></div>
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
