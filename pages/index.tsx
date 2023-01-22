import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import io, { Socket } from 'socket.io-client'
import { FormEvent, KeyboardEvent, useRef, useState } from 'react'
import { useEffectAfterMount } from '../utils/hooks'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { P5CanvasInstance, P5WrapperProps, Sketch } from 'react-p5-wrapper'
const ReactP5Wrapper = dynamic(() => import('react-p5-wrapper')
    .then(mod => mod.ReactP5Wrapper), {
    ssr: false
}) as unknown as React.NamedExoticComponent<P5WrapperProps>

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
    const ROWS = 20
    const COLS = 10
    const TILEWIDTH = 30
    const TILEHEIGHT = 30
    const SPACING = 2
    const RADIUS = 10

    class Playground {
        private cols: number
        private rows: number
        private tileWidth: number
        private tileHeight: number
        private spacing: number
        private radius: number
        private bgColor: RGB

        constructor(rows = 20, cols = 10, tileWidth = 30, tileHeight = 30, spacing = 2, radius = 10, bgColor = [230, 230, 230] as RGB) {
            this.cols = cols
            this.rows = rows
            this.tileWidth = tileWidth
            this.tileHeight = tileHeight
            this.spacing = spacing
            this.radius = radius
            this.bgColor = bgColor
        }

        draw = (p5: P5CanvasInstance) => {
            let x = 0
            let y = 0
            p5.fill(this.bgColor[0], this.bgColor[1], this.bgColor[2])
            p5.stroke(255,255,255)
            for (let i = 0; i < this.cols; i++) {
                for (let j = 0; j < this.rows; j++) {
                    const tile = p5.rect(x, y, this.tileWidth, this.tileHeight, this.radius)
                    y += this.tileHeight + this.spacing
                }
                y = 0
                x += this.tileWidth + this.spacing
            }
        }
    }
    class CanvasProps {
        width: number
        height: number

        constructor(rows = 20, cols = 10, tileWidth = 30, tileHeight = 30, spacing = 2) {
            this.width = tileWidth * cols + spacing * (cols - 1)
            this.height = tileHeight * rows + spacing * (rows - 1)
        }
    }

    class Piece {
        private type: PieceType
        private color: RGB
        private h: Hitbox
        private x: number
        private y: number
        constructor(type: PieceType, color: RGB, c: any) {
            this.type = type
            this.color = color
            this.x = 0
            this.y = 0
            this.h = { top: c.canvasHeight, right: 0, bottom: 0, left: c.canvasWidth}
            switch(type) {
                case 'bar':
                break;
            }
        }

        setX(x: number) {
            this.x = x
        }

        setY(y: number) {
            this.y = y
        }

        getHitbox() {
            return this.h
        }

        private setHitbox(x: number, y: number) {
            if (this.h.top > y) {
                this.h.top = y
            }
            if (this.h.right < x + TILEWIDTH) {
                this.h.right = x + TILEWIDTH
            }
            if (this.h.bottom < y + TILEHEIGHT) {
                this.h.bottom = y + TILEHEIGHT
            }
            if (this.h.left > x) {
                this.h.left = x
            }
        }

        drawBar = (p5: P5CanvasInstance) => {
            p5.fill(this.color[0], this.color[1], this.color[2])
            for (let i = 0; i < 4; i++) {
                const halfCols = Math.floor(COLS/2) // test purpose
                const x = this.x + TILEWIDTH * halfCols + (SPACING * halfCols)
                const y = this.y + TILEHEIGHT * i + SPACING * i
                p5.rect(
                    x,
                    y,
                    TILEWIDTH,
                    TILEHEIGHT,
                    RADIUS
                )
                this.setHitbox(x, y)
            }
        }
    }

    const sketch: Sketch = (p5) => {
        const playground = new Playground()
        const canvasProps = new CanvasProps()
        p5.setup = () => {
            p5.createCanvas(canvasProps.width, canvasProps.height)
            p5.frameRate(30)
        }
        const tee = new Piece('T', [255, 0, 0], canvasProps)
        let newY = 0
        p5.draw = () => {
            p5.background(250);
            playground.draw(p5)
            tee.drawBar(p5)
            let h = tee.getHitbox()
            if (p5.frameCount % 30 === 0 && h.bottom < canvasProps.height) {
                // move piece
                const dy = 1
                newY = newY + dy * (TILEHEIGHT + SPACING)
                tee.setY(newY)
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
                {/* <div ref={p5ContainerRef} /> */}
                <form onSubmit={onSubmit} action=''>
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
                </div>
            </main>

            <div className={styles.card}></div>

            <footer className={styles.footer}>
            </footer>
        </div>
    )
}

export default Home
