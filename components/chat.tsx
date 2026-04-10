import { KeyboardEvent, useContext, useEffect, useState } from "react";
import { SocketContext } from "../context/socket";

type Message = {
    author: string,
    message: string
}

type ChatProps = {
    playerName: string
}

const Chat = ({ playerName }: ChatProps) => {
    const socket = useContext(SocketContext)
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState<Array<Message>>([])

    useEffect(() => {
        const handleMessages = (messages: Message[]) => {
            setMessages(messages)
        }

        const handleNewMsg = (msg: Message) => {
            setMessages((currentMsg) => [
                ...currentMsg,
                { author: msg.author, message: msg.message }
            ])
        }

        socket.on('messages', handleMessages)
        socket.on('newIncomingMsg', handleNewMsg)

        return () => {
            socket.off('messages', handleMessages)
            socket.off('newIncomingMsg', handleNewMsg)
        }
    }, [])

    const sendMessage = async () => {
        socket.emit('createdMessage', { author: playerName, message })
        setMessages((currentMsg) => [
            ...currentMsg,
            { author: playerName, message }
        ])
        setMessage('')
    }

    const handleKeypress = (e: KeyboardEvent<HTMLInputElement>) => {
        switch(e.currentTarget.id) {
            case 'message_input':
                if (e.key === 'Enter') {
                    if (message) {
                        sendMessage()
                    }
                }
                break;
        }
    }

    return (
        <div className='flex flex-col bg-white w-full rounded-lg shadow-sm shadow-brand overflow-hidden flex-1' role='region' aria-label='Chat'>
            <div className='flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-brand' aria-live='polite' aria-relevant='additions'>
            {messages.map((msg, i) => {
                return (
                <div
                    className="w-full py-2 px-3 border-b border-neutral-100"
                    key={i}
                >
                    <span className='sr-only'>{msg.author} says:</span>
                    <span className='font-semibold text-brand-dark'>{msg.author}:</span>{' '}
                    <span className='text-neutral-600'>{msg.message}</span>
                </div>
                );
            })}
            </div>
            <div className="border-t border-neutral-200 w-full flex">
            <input
                id='message_input'
                type="text"
                placeholder="New message..."
                value={message}
                aria-label='Chat message'
                className="py-2.5 px-3 flex-1 text-sm placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-inset focus:ring-brand"
                onChange={(e) => setMessage(e.target.value)}
                onKeyUp={handleKeypress}
            />
            <button
                className="uppercase px-4 text-sm font-semibold bg-brand hover:bg-brand-hover hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand"
                aria-label='Send message'
                onClick={() => {
                    sendMessage();
                }}
            >
                Send
            </button>
            </div>
        </div>
    )
}

export default Chat