import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import { FormEvent, KeyboardEvent, useContext, useState } from 'react'
import { useEffectAfterMount } from '../utils/hooks'
import { useRouter } from 'next/router'

import Game from '../components/Game'
import { SocketContext } from '../context/socket'

type Message = {
    author: string,
    message: string
}

const Home: NextPage = () => {
    const router = useRouter()
    const socket = useContext(SocketContext)

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
                <Game />
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
