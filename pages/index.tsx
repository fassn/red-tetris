import dynamic from "next/dynamic"
import { P5CanvasInstance, P5WrapperProps, Sketch } from "react-p5-wrapper"
const ReactP5Wrapper = dynamic(() => import('react-p5-wrapper')
    .then(mod => mod.ReactP5Wrapper), {
    ssr: false
}) as unknown as React.NamedExoticComponent<P5WrapperProps>
import type { NextPage } from 'next'
import Head from 'next/head'
import { ChangeEvent, FormEvent, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/router'

import Chat from '../components/chat'
import { SocketContext } from '../context/socket'

import { APP_BACKGROUND_COLOR, BACKGROUND_COLOR, BOARDHEIGHT, BOARDWIDTH, CANVASHEIGHT, CANVASWIDTH, COLOR_PALETTE, COLS, FRAMERATE, RADIUS, ROWS, SPACING, TILEHEIGHT, TILEWIDTH } from "../utils/config"
import { PieceProps, RGBA, Stack } from "../utils/game"

interface FormData {
    room_name: { value: string },
    player_name: { value: string }
}

enum ARROW {
    UP,
    DOWN = 40,
    LEFT = 37,
    RIGHT = 39
}

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

type TileProps = {
    x: number
    y: number
    dy: number
    gravity: number
    friction: number
    color: RGBA
}

let color = BACKGROUND_COLOR
let currentPiece: PieceProps = {
    x: 0,
    y: 0,
    points: [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}],
    color: { r: color.r, g: color.g, b: color.b }
}
let nextPiece: PieceProps = {
    x: 0,
    y: 0,
    points: [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}],
    color: { r: color.r, g: color.g, b: color.b }
}

let stack = function () {
    let newStack = new Array<Stack>(ROWS*COLS)
    for (let i = 0; i < ROWS*COLS; i++) {
        newStack[i] = { isFilled: false, color: { r: 0, g: 0, b: 0, a: 0 } }
    }
    return newStack
}()

let getCascadeTilesCalled = false
let cascadeTiles: TileProps[] = []

let score = 0
let gameWon = false

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

        socket.on('session', ({ sessionId, playerId }) => {
            socket.auth = { sessionId }
            localStorage.setItem('sessionId', sessionId)
            socket.playerId = playerId
        })

        socket.on('newState', (newState) => {
            setPlayerState(newState)
        })

        socket.on('newOtherPlayerState', (newOtherPlayerState) => {
            setOtherPlayerState(newOtherPlayerState)
        })

        socket.on('newGame', ({ newStack, firstPiece, secondPiece }: { newStack: Stack[], firstPiece: PieceProps, secondPiece: PieceProps}) => {
            stack = newStack
            currentPiece = firstPiece
            nextPiece = secondPiece
        })

        socket.on('newStack', ({ newStack, newScore }: { newStack: Stack[], newScore: number }) => {
            stack = newStack
            score = newScore
        })

        socket.on('newPosition', (newY) => {
            currentPiece.y = newY
        })

        socket.on('newPiece', ({ newCurrentPiece, newNextPiece }: { newCurrentPiece: PieceProps, newNextPiece: PieceProps }) => {
            currentPiece = newCurrentPiece
            nextPiece = newNextPiece
        })

        socket.on('newMoveDown', (newY) => {
            currentPiece.y = newY
        })

        socket.on('newMoveLeft', (newX) => {
            currentPiece.x = newX
        })

        socket.on('newMoveRight', (newX) => {
            currentPiece.x = newX
        })

        socket.on('newPoints', (newPoints) => {
            currentPiece.points = newPoints
        })

        socket.on('gameWon', () => {
            gameWon = true
        })

        socket.on('resetGame', () => {
            currentPiece = {
                x: 0,
                y: 0,
                points: [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}],
                color: { r: color.r, g: color.g, b: color.b }
            }
            nextPiece = {
                x: 0,
                y: 0,
                points: [{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}],
                color: { r: color.r, g: color.g, b: color.b }
            }
            stack = function () {
                let newStack = new Array<Stack>(ROWS*COLS)
                for (let i = 0; i < ROWS*COLS; i++) {
                    newStack[i] = { isFilled: false, color: { r: 0, g: 0, b: 0, a: 0 } }
                }
                return newStack
            }()
            getCascadeTilesCalled = false
            cascadeTiles = []
            score = 0
            gameWon = false
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
        // TODO
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

    const startGame = () => {
        socket.emit('startGame')
    }

    const sketch: Sketch = (p5) => {
        p5.setup = () => {
            p5.createCanvas(CANVASWIDTH, CANVASHEIGHT)
            p5.frameRate(FRAMERATE)
        }
        p5.draw = () => {
            drawStack(p5)
            if (playerState.playState === PlayState.PLAYING) {
                handleKeyboard(p5)
                drawPiece(p5)
                drawNextPiece(p5)
                drawScore(p5)
            }
            if (playerState.playState === PlayState.ENDGAME) {
                handleMouse(p5)
                if (gameWon) {
                    if (!getCascadeTilesCalled) {
                        getCascadeTiles()
                    }
                    drawWin(p5)
                }
                else {
                    drawLose(p5)
                }
            }
        }
    }

    const drawWin = (p5: P5CanvasInstance) => {
        // redraw interline spacings
        const color = APP_BACKGROUND_COLOR
        p5.fill(color.r, color.g, color.b)
        p5.stroke(255,255,255)
        p5.rect(0, 0, BOARDWIDTH, BOARDHEIGHT)

        // reset stack tiles
        stack = function () {
            let newStack = new Array<Stack>(ROWS*COLS)
            for (let i = 0; i < ROWS*COLS; i++) {
                newStack[i] = { isFilled: false, color: { r: 0, g: 0, b: 0, a: 0 } }
            }
            return newStack
        }()
        drawStack(p5)

        // draw cascade tiles
        for (let tile of cascadeTiles) {
            if (tile.y > BOARDHEIGHT - TILEHEIGHT + SPACING) {
                tile.dy = -tile.dy
            } else {
                tile.dy += tile.gravity
            }
            p5.fill(tile.color.r, tile.color.g, tile.color.b, tile.color.a)
            p5.rect(tile.x, tile.y, TILEWIDTH, TILEHEIGHT, RADIUS)
            tile.y += tile.dy
        }

        // "ATTA BOY!!!" text
        p5.fill(0,0,0)
        p5.textSize(55)
        p5.textFont('Helvetica')
        p5.text('ATTA BOY!!!', 5, BOARDHEIGHT / 2 )

        p5.fill(0,0,0)
        p5.textSize(20)
        p5.textFont('Helvetica')
        p5.text('(click to quit game)', 75, BOARDHEIGHT - 40)
    }

    const getCascadeTiles = () => {
        for (let col = 0; col < COLS; col++) {
            for (let row = 0; row < ROWS; row++) {
                if (stack[row * COLS + col].isFilled) {
                    const tile: TileProps = {
                        x: col * (TILEWIDTH + SPACING),
                        y: row * (TILEHEIGHT + SPACING),
                        dy: 1,
                        gravity: 1,
                        friction: 0.9,
                        color: stack[row * COLS + col].color
                    }
                    cascadeTiles.push(tile)
                }
            }
        }
        getCascadeTilesCalled = true
    }

    let i = 0;
    const drawLose = (p5: P5CanvasInstance) => {
        const colors: RGBA[] = COLOR_PALETTE
        p5.fill(colors[i].r, colors[i].g, colors[i].b)
        p5.stroke(255,255,255)
        p5.rect(0, 0, BOARDWIDTH, BOARDHEIGHT)

        p5.fill(0,0,0)
        p5.textSize(55)
        p5.textFont('Helvetica')
        p5.text('YOU SUCK', 15, BOARDHEIGHT / 2 )

        p5.fill(0,0,0)
        p5.textSize(20)
        p5.textFont('Helvetica')
        p5.text('(click to quit game)', 75, BOARDHEIGHT - 40)

        i++
        if (i % 3 === 0) {
            i = 0
        }
    }

    const drawStack = (p5: P5CanvasInstance) => {
        let x = 0
        let y = 0
        const bg = BACKGROUND_COLOR
        p5.fill(bg.r, bg.g, bg.b)
        p5.stroke(255,255,255)
        for (let i = 0; i < COLS; i++) {
            for (let j = 0; j < ROWS; j++) {
                const tile = stack[j * COLS + i]
                if (tile.isFilled) {
                    p5.fill(tile.color.r, tile.color.g, tile.color.b)
                    p5.rect(x, y, TILEWIDTH, TILEHEIGHT, RADIUS)
                } else {
                    p5.fill(bg.r, bg.g, bg.b)
                    p5.rect(x, y, TILEWIDTH, TILEHEIGHT, RADIUS)
                }
                y += TILEHEIGHT + SPACING
            }
            y = 0
            x += TILEWIDTH + SPACING
        }
    }

    const drawPiece = (p5: P5CanvasInstance) => {
        p5.fill(currentPiece.color.r, currentPiece.color.g, currentPiece.color.b)
        for (let i = 0; i < 4; i++) {
            const newX = currentPiece.x + currentPiece.points[i].x
            const newY = currentPiece.y + currentPiece.points[i].y
            p5.rect(
                newX,
                newY,
                TILEWIDTH,
                TILEHEIGHT,
                RADIUS
            )
        }
    }

    const drawNextPiece = (p5: P5CanvasInstance) => {
        // cover previous NextPiece
        const color = APP_BACKGROUND_COLOR
        p5.fill(color.r, color.g, color.b)
        p5.noStroke()
        p5.rect(BOARDWIDTH, 0, 320, 128)

        // "Next:" text
        p5.fill(0,0,0)
        p5.textSize(38)
        p5.textFont('Helvetica')
        p5.text('Next:', BOARDWIDTH + 32, 32)

        p5.fill(nextPiece.color.r, nextPiece.color.g, nextPiece.color.b)
        for (let i = 0; i < 4; i++) {
            const newX = nextPiece.x + nextPiece.points[i].x + (TILEWIDTH + SPACING) * 7
            const newY = nextPiece.y + nextPiece.points[i].y + (TILEWIDTH + SPACING) * 2
            p5.rect(
                newX,
                newY,
                TILEWIDTH,
                TILEHEIGHT,
                RADIUS
            )
        }
    }

    const drawScore = (p5: P5CanvasInstance) => {
        // cover previous score
        const color = APP_BACKGROUND_COLOR
        p5.fill(color.r, color.g, color.b)
        p5.noStroke()
        p5.rect(BOARDWIDTH, 196, 320, 128)

        // "Score:" text
        p5.fill(0,0,0)
        p5.textSize(38)
        p5.textFont('Helvetica')
        p5.text('Score:', BOARDWIDTH + 32, 224)

        p5.text(score, BOARDWIDTH + 32, 288)
    }

    const handleKeyboard = (p5: P5CanvasInstance) => {
        if (p5.keyIsDown(ARROW.DOWN)) {
            socket.emit('moveDown')
        }
        p5.keyPressed = (event: KeyboardEvent) => {
            if (event.key ===  'ArrowUp') {
                socket.emit('rotate')
            }
            if (event.key === 'ArrowLeft') {
                socket.emit('moveLeft')
            }
            if (event.key === 'ArrowRight') {
                socket.emit('moveRight')
            }
        }
    }

    const handleMouse = (p5: P5CanvasInstance) => {
        p5.mouseClicked = () => {
            socket.emit('quitGame')
        }
    }

    const HostMenu = () => {
        return (
            <>
                <Logo />
                <div className='flex flex-col justify-center'>
                    <div className='text-center text-lg mb-4'>{otherPlayerState.playState === PlayState.READY ? 'Your opponent is ready !' : 'Wait for your opponent to be ready or start a game alone.'}</div>
                    <div className='border-t border-2 border-red-500'></div>
                    <button onClick={startGame} className='py-4 w-72 self-center text-xl uppercase mt-10 bg-red-400 rounded hover:text-white transition-all'>Start Game</button>
                </div>
            </>
        )
    }

    const GuestMenu = () => {
        return (
            <>
                <Logo />
                <div className='flex flex-col text-lg justify-center'>
                    <div className='text-center mb-4'>Wait for the game leader to start the game !</div>
                    <div className='border-t border-2 border-red-500'></div>
                    <div className='flex justify-center mt-10 mb-4'>
                        <label htmlFor='ready'>Ready?</label>
                        <input id='ready' name='ready' type='checkbox' checked={playerState.playState === PlayState.READY} className='accent-red-400 mx-6 w-7' onChange={setReady} />
                    </div>
                </div>
            </>
        )
    }

    const Logo = () => {
        return (
            <div className='flex h-32 justify-center items-center bg-red-400 mx-5 rounded'>
                <h1 className='text-5xl uppercase'>Red Tetris</h1>
            </div>
        )
    }

    const Lobby = () => {
        if (playerState.playState === PlayState.PLAYING || playerState.playState === PlayState.ENDGAME) {
            return <Logo />
        }
        if (playerState.host === true) {
            return <HostMenu />
        }
        if (playerState.host === false && otherPlayerState.playState !== PlayState.PLAYING) {
            return <GuestMenu />
        }
        if (playerState.host === false && otherPlayerState.playState === PlayState.PLAYING) {
            <>
                <Logo />
                <div className='flex flex-col text-lg justify-center'>
                    <div className="text-center mx-4">A game is on-going. Please wait for it to finish !</div>
                </div>
            </>
        }
        return <></>
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
                            <Lobby />
                        </div>
                        <div className='flex w-full justify-center'>
                            <ReactP5Wrapper sketch={sketch} />
                        </div>
                        <div className='flex w-auto justify-end'>
                            <div className='border-l border-2 border-red-500 mr-24'></div>
                            <Chat playerName={playerName} />
                        </div>
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

            <footer className='fixed bottom-0 flex w-full h-20 bg-red-400 px-8 justify-center items-center'>
                <div className='text-center uppercase text-xl'>© 2023 fassn</div>
            </footer>
        </div>
    )
}

export default Home
