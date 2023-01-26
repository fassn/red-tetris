import dynamic from 'next/dynamic'
const ReactP5Wrapper = dynamic(() => import('react-p5-wrapper')
    .then(mod => mod.ReactP5Wrapper), {
    ssr: false
}) as unknown as React.NamedExoticComponent<P5WrapperProps>
import type { NextPage } from 'next'
import Head from 'next/head'
import { ChangeEvent, FormEvent, useContext, useState } from 'react'
import { useEffectAfterMount } from '../utils/hooks'
import { useRouter } from 'next/router'

import GameClient from '../components/game-client'
import { BOARDHEIGHT, BOARDWIDTH, COLS, RADIUS, ROWS, SPACING, TILEHEIGHT, TILEWIDTH } from '../utils/config'
import { P5CanvasInstance, P5WrapperProps, Sketch } from 'react-p5-wrapper'
import Chat from '../components/chat'
import { SocketContext } from '../context/socket'

interface FormData {
    room_name: { value: string },
    player_name: { value: string }
}

const Home: NextPage = () => {
    const socket = useContext(SocketContext)
    const router = useRouter()

    const [room, setRoom] = useState('')
    const [playerName, setPlayerName] = useState('')
    const [isLobby, setIsLobby] = useState(false)
    const [opponentIsReady, setOpponentIsReady] = useState(false)
    const [isStarted, setIsStarted] = useState(false)
    const [isGameLeader, setIsGameLeader] = useState(false)

    let sessionId: string | null
    useEffectAfterMount(() => {
        socketInit()
        sessionId = localStorage.getItem('sessionId')

        // direct URL connection
        let { room, name } = parseHash(router.asPath)
        if (room && name) {
            setRoom(room)
            setPlayerName(name)
            setIsLobby(true)
            connectSocketClient(room, name)
        }

        // after form submit
        const handleHashChange = (url: any, { shallow }: any) => {
            ({ room, name } = parseHash(url))
            if (room && name) {
                setRoom(room)
                setPlayerName(name)
                setIsLobby(true)
                connectSocketClient(room, name)
            }
        }

        router.events.on('hashChangeComplete', handleHashChange)

        socket.on('session', ({ sessionId, userId }) => {
            socket.auth = { sessionId }
            localStorage.setItem('sessionId', sessionId)
            socket.userId = userId
        })

        socket.on('isOpponentReady', (isReady) => {
            setOpponentIsReady(isReady)
        })

        socket.on('setGameLeader', (playerName) => {
            if (playerName === name) {
                socket.emit('initGame')
                setIsGameLeader(true)
            }
        })

        socket.on('joinGame', () => {
            setIsStarted(true)
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

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const target = event.target as EventTarget & FormData

        if (validateInput(target)) {
            target.room_name
            router.push(`/#${target.room_name.value}[${target.player_name.value}]`)
        }
    }

    const validateInput = (event: EventTarget & FormData) => {
        //
        return true
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

    const setReady = (event: ChangeEvent<HTMLInputElement>) => {
        socket.emit('setReady', event.target.checked)
    }

    const drawBackground = (p5: P5CanvasInstance) => {
        let x = 0
        let y = 0
        p5.fill(230, 230, 230)
        p5.stroke(255,255,255)
        for (let i = 0; i < COLS; i++) {
            for (let j = 0; j < ROWS; j++) {
                p5.fill(230, 230, 230)
                p5.rect(x, y, TILEWIDTH, TILEHEIGHT, RADIUS)
                y += TILEHEIGHT + SPACING
            }
            y = 0
            x += TILEWIDTH + SPACING
        }
    }

    const sketch: Sketch = (p5) => {

        p5.setup = () => {
            p5.createCanvas(BOARDWIDTH, BOARDHEIGHT)
        }
        p5.draw = () => {
            drawBackground(p5)
        }
    }

    const startGame = () => {
        setIsStarted(true)
    }

    return (
        <div className='px-8'>
            <Head>
                <title>Red Tetris</title>
                <meta name="description" content="A Typescript Implementation of Tetris" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            {
                isLobby ?
                <main className='h-screen'>
                    <div className='flex flex-col p-20'>
                        <div className='flex'>
                            <div className='flex w-1/3 justify-start'>
                                <Chat playerName={playerName} />
                            </div>
                            <div className='flex w-2/3 justify-start'>
                                {
                                    isStarted ?
                                    <GameClient /> :
                                    <ReactP5Wrapper sketch={sketch} />
                                }
                            </div>
                            {/* <div className='border-l border-2 border-red-500'></div> */}
                        </div>
                        {
                            isStarted ?
                            <></> :
                                isGameLeader ?
                                <div className='flex flex-grow flex-col w-2/3 h-1/2 my-10'>
                                    <div className='self-center text-lg mt-20 mb-4'>{opponentIsReady ? 'Your opponent is ready !' : 'Wait for your opponent to be ready or start a game alone.'}</div>
                                    <div className='border-t border-2 border-red-500'></div>
                                    <button onClick={startGame} className='py-4 w-1/3 self-center text-xl uppercase my-10 bg-red-400 rounded hover:text-white transition-all'>Start Game</button>
                                </div> :
                                <div>
                                    <label htmlFor='ready'>Ready?</label>
                                    <input id='ready' name='ready' type='checkbox' onChange={setReady} />
                                </div>
                        }
                    </div>
                </main>
                :
                <main className='min-h-screen flex flex-grow flex-col justify-center items-center py-16 px-0'>
                    <h1 className='text-center m-0 leading-[1.15] text-[4rem]'>
                        Welcome to Red Tetris!
                    </h1>
                    <form className='flex flex-col w-96 m-16 px-6 pt-16 pb-8 outline shadow-md shadow-red-500 drop-shadow-lg outline-red-500 rounded' onSubmit={onSubmit} action=''>
                        <div className='flex my-3'>
                            <label className='w-1/3 self-center text-center' htmlFor='room_name'>Room name</label>
                            <input className='w-2/3 h-10 px-3 outline-1 outline rounded' type='text' id='room_name' name='room_name' required></input>
                        </div>
                        <div className='flex my-3'>
                            <label className='w-1/3 self-center text-center' htmlFor='player_name'>Player name</label>
                            <input className='w-2/3 h-10 px-3 outline-1 outline rounded' type='text' id='player_name' name='player_name' required></input>
                        </div>
                        <button className='mt-16 p-3 w-full bg-red-400 rounded uppercase' type='submit'>Start/Join room</button>
                    </form>
                </main>
            }

            {/* <footer className={styles.footer}></footer> */}
        </div>
    )
}

export default Home
