import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import io, { Socket } from 'socket.io-client'
import { FormEvent, KeyboardEvent, useState } from 'react'
import { useEffectAfterMount } from '../utils/hooks'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { P5CanvasInstance, P5WrapperProps, Sketch } from 'react-p5-wrapper'
const ReactP5Wrapper = dynamic(() => import('react-p5-wrapper')
    .then(mod => mod.ReactP5Wrapper), {
    ssr: false
}) as unknown as React.NamedExoticComponent<P5WrapperProps>

import { Point, POINTS } from '../utils/points'
import { ROWS, COLS, TILEWIDTH, TILEHEIGHT, SPACING, RADIUS, CANVASWIDTH, CANVASHEIGHT } from '../utils/config'

let socket: Socket

type Message = {
    author: string,
    message: string
}

const Home: NextPage = () => {
    const router = useRouter()

    const [username, setUsername] = useState('')
    const [chosenUsername, setChosenUsername] = useState('')
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState<Array<Message>>([])

    useEffectAfterMount(() => {
        socketInit()

        let { room, name } = parseHash(router.asPath)
        if (room && name) {
            // trigger game logic
        }

        const handleHashChange = (url: any, { shallow }: any) => {
            ({ room, name } = parseHash(url))
            if (room && name) {
                // trigger game logic
            }
        }

        router.events.on('hashChangeComplete', handleHashChange)

        return () => {
            router.events.off('hashChangeComplete', handleHashChange)
            // p5Instance.remove()
        }
    }, [])

    type PieceType = 'bar'|'left_L'|'right_L'|'cube'|'T'|'Z'|'rev_Z'
    type RGB = [number, number, number]
    type Hitbox = {
        top: number,
        right: number,
        bottom: number,
        left: number
    }

    class Playground {
        private bgColor: RGB
        stack: boolean[]

        constructor(bgColor = [230, 230, 230] as RGB) {
            this.bgColor = bgColor
            this.stack = new Array<boolean>(ROWS*COLS)
            for (let i = 0; i < ROWS*COLS; i++) {
                this.stack[i] = false
            }
        }

        draw = (p5: P5CanvasInstance) => {
            let x = 0
            let y = 0
            p5.fill(this.bgColor[0], this.bgColor[1], this.bgColor[2])
            p5.stroke(255,255,255)
            for (let i = 0; i < COLS; i++) {
                for (let j = 0; j < ROWS; j++) {
                    const tile = p5.rect(x, y, TILEWIDTH, TILEHEIGHT, RADIUS)
                    y += TILEHEIGHT + SPACING
                }
                y = 0
                x += TILEWIDTH + SPACING
            }
        }
    }

    enum ARROW {
        UP,
        DOWN = 40,
        LEFT = 37,
        RIGHT = 39
    }

    enum ROTATION {
        FIRST,
        SECOND,
        THIRD,
        FOURTH
    }
    class Piece {
        private type: PieceType
        private color: RGB
        private points: [Point, Point, Point, Point]
        private h: Hitbox
        private x: number
        private y: number
        private active: boolean
        private r_state: ROTATION

        constructor(type: PieceType, color: RGB) {
            this.type = type
            this.color = color
            this.x = 0
            this.y = 0
            this.h = { top: CANVASHEIGHT, right: 0, bottom: 0, left: CANVASWIDTH}
            this.r_state = ROTATION.FIRST
            this.active = true
            switch(type) {
                case 'bar':
                    this.points = POINTS.bar[0]
                    break;
                case 'left_L':
                    this.points = POINTS.left_L[0]
                    break
                case 'right_L':
                    this.points = POINTS.right_L[0]
                    break
                case 'cube':
                    this.points = POINTS.cube[0]
                    break
                case 'T':
                    this.points = POINTS.T[0]
                    break
                case 'Z':
                    this.points = POINTS.Z[0]
                    break
                case 'rev_Z':
                    this.points = POINTS.rev_Z[0]
                    break
                default:
                    throw new Error('The piece type doesn\'t exist.')
            }
        }

        setActive(state: boolean) {
            this.active = state
        }

        isActive() {
            return this.active
        }

        getX() {
            return this.x
        }

        getY() {
            return this.y
        }

        setX(x: number, stack: boolean[]) {
            if (this.isHittingRightOrLeft(x, stack)) {
                return
            }
            this.x = x
        }

        setY(y: number, stack: boolean[]) {
            if (this.isHittingDown(y, stack)) {
                this.active = false
                return
            }
            this.y = y
        }

        canRotate(stack: boolean[]): boolean {
            let newPoints: [Point, Point, Point, Point]
            switch (this.r_state) {
                case ROTATION.FIRST:
                    newPoints = POINTS[this.type][1]
                break;
                case ROTATION.SECOND:
                    newPoints = POINTS[this.type][2]
                break;
                case ROTATION.THIRD:
                    newPoints = POINTS[this.type][3]
                break;
                case ROTATION.FOURTH:
                    newPoints = POINTS[this.type][0]
                break;
            }

            for (let i = 0; i < 4; i++) {
                const { x, y } = newPoints[i]

                if (this.y + y > CANVASHEIGHT) {
                    return false
                }
                if ((this.x + x) < 0 || (this.x + x) > CANVASWIDTH) {
                    return false
                }

                const idxX = (this.x + x) / (TILEWIDTH + SPACING)
                const idxY = (this.y + y) / (TILEHEIGHT + SPACING)
                if (stack[idxY * ROWS + idxX]) {
                    return false
                }
            }
            return true
        }

        rotate = () => {
            switch (this.r_state) {
                case ROTATION.FIRST:
                    this.r_state = ROTATION.SECOND
                    this.points = POINTS[this.type][1]
                break;
                case ROTATION.SECOND:
                    this.r_state = ROTATION.THIRD
                    this.points = POINTS[this.type][2]
                break;
                case ROTATION.THIRD:
                    this.r_state = ROTATION.FOURTH
                    this.points = POINTS[this.type][3]
                break;
                case ROTATION.FOURTH:
                    this.r_state = ROTATION.FIRST
                    this.points = POINTS[this.type][0]
                break;
            }
        }

        down = (stack: boolean[]) => {
            const y = this.y + TILEHEIGHT + SPACING
            if (this.isHittingDown(y, stack)) {
                return
            }
            this.y = y
        }

        // hitsRight(stack: boolean[]) {
        //     const index = this.h.right / (TILEHEIGHT + SPACING)
        //     if (index >= COLS) return true
        // }

        // hitsLeft(stack: boolean[]) {
        //     const index = this.h.left / (TILEWIDTH + SPACING)
        //     if (index === 0) return true
        // }

        // hitsDown(stack: boolean[]) {
        //     const index = this.h.bottom / (TILEHEIGHT + SPACING)
        //     // stack[index * ]
        //     if (index >= ROWS) {
        //         this.active = false
        //         return true
        //     }
        //     // stack[]
        // }

        isHittingDown(newY: number, stack: boolean[]): boolean {
            for (let i = 0; i < 4; i++) {
                const { x, y } = this.points[i]

                if (newY + y > CANVASHEIGHT) {
                    return true
                }

                const idxX = (this.x + x) / (TILEWIDTH + SPACING)
                const idxY = (newY + y) / (TILEHEIGHT + SPACING)
                if (stack[idxY * ROWS + idxX]) {
                    return true
                }
            }
            return false
        }

        isHittingRightOrLeft(newX: number, stack: boolean[]): boolean {
            for (let i = 0; i < 4; i++) {
                const { x, y } = this.points[i]

                if ((newX + x) < 0 || (newX + x) > CANVASWIDTH) {
                    return true
                }

                const idxX = (newX + x) / (TILEWIDTH + SPACING)
                const idxY = (this.y + y) / (TILEHEIGHT + SPACING)
                if (stack[idxY * ROWS + idxX]) {
                    return true
                }
            }
            return false
        }

        private setHitbox(minX: number, maxX: number, minY: number, maxY: number) {
            this.h.top = minY
            this.h.right = maxX + TILEWIDTH + SPACING
            this.h.bottom = maxY + TILEHEIGHT + SPACING
            this.h.left = minX
        }

        draw = (p5: P5CanvasInstance) => {
            p5.fill(this.color[0], this.color[1], this.color[2])
            let minX = CANVASWIDTH
            let minY = CANVASHEIGHT
            let maxX = 0
            let maxY = 0
            for (let i = 0; i < 4; i++) {
                const halfCols = Math.floor(COLS/2) - 1 // test purpose
                const mid = halfCols * (TILEWIDTH + SPACING) // test purpose
                const x = this.x + this.points[i].x
                const y = this.y + this.points[i].y
                p5.rect(
                    x,
                    y,
                    TILEWIDTH,
                    TILEHEIGHT,
                    RADIUS
                )
                if (x < minX) {
                    minX = x
                }
                if (x > maxX) {
                    maxX = x
                }
                if (y < minY) {
                    minY = y
                }
                if (y > maxY) {
                    maxY = y
                }
            }
            this.setHitbox(minX, maxX, minY, maxY)
        }
    }

    const sketch: Sketch = (p5) => {
        const pg = new Playground()
        p5.setup = () => {
            p5.createCanvas(CANVASWIDTH, CANVASHEIGHT)
            p5.frameRate(30)
        }
        const piece = new Piece('left_L', [255, 0, 0])
        p5.draw = () => {
            p5.background(250);
            pg.draw(p5)

            if (p5.keyIsDown(ARROW.DOWN)) {
                piece.down(pg.stack)
            }
            if (p5.keyIsDown(ARROW.LEFT)) {
                piece.setX(piece.getX() - TILEWIDTH - SPACING, pg.stack)
            }
            if (p5.keyIsDown(ARROW.RIGHT)) {
                piece.setX(piece.getX() + TILEWIDTH + SPACING, pg.stack)
            }
            p5.keyPressed = (event: KeyboardEvent) => {
                if (event.key ===  'ArrowUp') {
                    if (piece.canRotate(pg.stack)) {
                        piece.rotate()
                    }
                }
            }
            piece.draw(p5)

            if (p5.frameCount % 30 === 0) {
                // move piece
                const dy = 1
                const newY = piece.getY() + dy * (TILEHEIGHT + SPACING)
                piece.setY(newY, pg.stack)
                if (!piece.isActive()) {
                    socket.emit('newPiece')
                }
            }
        }
    }

    const parseHash = (url: string) => {
        const hash: string = url.split('#')[1] || '';
        const match = hash.match(/[^\[\]]+/g)
        if (match) return { room: match[0], name: match[1] }
        return {}
    }

    const socketInit = async () => {
        await fetch('/api/socket-handler')

        socket = io()

        socket.on('newIncomingMsg', (msg: Message) => {
            setMessages((currentMsg) => [
                ...currentMsg,
                { author: msg.author, message: msg.message }
            ])
        })
    }

    const sendMessage = async () => {
        socket.emit('createdMessage', { author: chosenUsername, message })
        setMessages((currentMsg) => [
            ...currentMsg,
            { author: chosenUsername, message }
        ])
        setMessage('')
    }

    const handleKeypress = (e: KeyboardEvent<HTMLInputElement>) => {
        switch(e.currentTarget.id) {
            case 'username_input':
                if (e.key === 'Enter') {
                    setChosenUsername(e.currentTarget.value)
                }
                break;
            case 'message_input':
                if (e.key === 'Enter') {
                    if (message) {
                        sendMessage()
                    }
                }
                break;
        }
    }

    interface FormData {
        room_name: { value: string },
        player_name: { value: string }
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

    return (
        <div className={styles.container}>
            <Head>
                <title>Red Tetris</title>
                <meta name="description" content="A Typescript Implementation of Tetris" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
                <ReactP5Wrapper sketch={sketch} />
                {/* <form onSubmit={onSubmit} action=''>
                    <label htmlFor='room_name'>Room name</label>
                    <input type='text' id='room_name' name='room_name' required></input>
                    <label htmlFor='player_name'>Player name</label>
                    <input type='text' id='player_name' name='player_name' required></input>
                    <button type='submit'>Start room</button>
                </form>
                <h1 className={styles.title}>
                    Welcome to Red Tetris!
                </h1>
                <div>
                    {!chosenUsername ? (
                        <>
                        <h3 className="font-bold text-white text-xl">
                            How people should call you?
                        </h3>
                        <input
                            id='username_input'
                            type="text"
                            placeholder="Identity..."
                            value={username}
                            className="p-3 rounded-md outline-none"
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyUp={handleKeypress}
                        />
                        <button
                            onClick={() => {
                            setChosenUsername(username);
                            }}
                            className="bg-white rounded-md px-4 py-2 text-xl"
                        >
                            Go!
                        </button>
                        </>
                    ) : (
                        <>
                        <p className="font-bold text-white text-xl">
                            Your username: {username}
                        </p>
                        <div className="flex flex-col justify-end bg-white h-[20rem] min-w-[33%] rounded-md shadow-md ">
                            <div className="h-full last:border-b-0 overflow-y-scroll">
                            {messages.map((msg, i) => {
                                return (
                                <div
                                    className="w-full py-1 px-2 border-b border-gray-200"
                                    key={i}
                                >
                                    {msg.author} : {msg.message}
                                </div>
                                );
                            })}
                            </div>
                            <div className="border-t border-gray-300 w-full flex rounded-bl-md">
                            <input
                                id='message_input'
                                type="text"
                                placeholder="New message..."
                                value={message}
                                className="outline-none py-2 px-2 rounded-bl-md flex-1"
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyUp={handleKeypress}
                            />
                            <div className="border-l border-gray-300 flex justify-center items-center  rounded-br-md group hover:bg-purple-500 transition-all">
                                <button
                                className="group-hover:text-white px-3 h-full"
                                onClick={() => {
                                    sendMessage();
                                }}
                                >
                                Send
                                </button>
                            </div>
                            </div>
                        </div>
                        </>
                    )}
                </div> */}
            </main>

            {/* <div className={styles.card}></div>

            <footer className={styles.footer}>
            </footer> */}
        </div>
    )
}

export default Home
