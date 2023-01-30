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

export enum PlayState {
    WAITING,
    READY,
    PLAYING,
    ENDGAME
}

export type PlayerState = {
    host: boolean
    playState: PlayState
}

const Home: NextPage = () => {
    const socket = useContext(SocketContext)
    const router = useRouter()

    const [playerName, setPlayerName] = useState('')
    const [isLobby, setIsLobby] = useState(false)
    const [playerState, setPlayerState] = useState<PlayerState>({ host: false, playState: PlayState.WAITING })
    const [otherPlayerState, setOtherPlayerState] = useState<PlayerState>({ host: false, playState: PlayState.WAITING })

    let sessionId: string | null
    useEffect(() => {
        socketInit()
        sessionId = localStorage.getItem('sessionId')

        // direct URL connection
        let { room, name } = parseHash(router.asPath)
        if (room && name) {
            setPlayerName(name)
            setIsLobby(true)
            connectSocketClient(room, name)
        }

        // after form submit
        const handleHashChange = (url: any, { shallow }: any) => {
            ({ room, name } = parseHash(url))
            if (room && name) {
                setPlayerName(name)
                setIsLobby(true)
                connectSocketClient(room, name)
            }
        }

        router.events.on('hashChangeComplete', handleHashChange)

        socket.on('roomIsFull', () => {
            router.push('/?error=roomIsFull')
            setIsLobby(false)
        })

        socket.on('session', ({ sessionId, playerId }) => {
            socket.auth = { sessionId }
            localStorage.setItem('sessionId', sessionId)
            socket.playerId = playerId
        })

        socket.on('newState', ({ playerState, otherPlayerState }: { playerState: PlayerState, otherPlayerState: PlayerState }) => {
            if (playerState) {
                setPlayerState(playerState)
            }
            if (otherPlayerState) {
                setOtherPlayerState(otherPlayerState)
            }
        })

        return () => {
            router.events.off('hashChangeComplete', handleHashChange)
        }
    }, [])

    const parseHash = (url: string) => {
        const hash: string = url.split('#')[1] || '';
        const match = hash.match(/[^\[\]]+/g)
        if (match) return { room: match[0], name: match[1] }
        return {}
    }

    const socketInit = async () => {
        await fetch('/api/socket-handler')
    }

    const connectSocketClient = (roomName: string, playerName: string) => {
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
