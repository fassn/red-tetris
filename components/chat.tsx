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
        <div className='flex flex-col justify-end bg-white w-full rounded-md shadow-sm shadow-brand' role='region' aria-label='Chat'>
            <div className='h-64 lg:h-96 overflow-y-auto rounded-t-md scrollbar-thin scrollbar-thumb-brand' aria-live='polite' aria-relevant='additions'>
            {messages.map((msg, i) => {
                return (
                <div
                    className="w-full text-brand-darker py-1 px-2 border-b border-brand-light"
                    key={i}
                >
                    <span className='sr-only'>{msg.author} says:</span>
                    {msg.author} : {msg.message}
                </div>
                );
            })}
            </div>
            <div className="border-t w-full flex rounded-bl-md">
            <input
                id='message_input'
                type="text"
                placeholder="New message..."
                value={message}
                aria-label='Chat message'
                className="text-brand-dark placeholder-brand-dark outline-none py-2 px-2 rounded-bl-md flex-1"
                onChange={(e) => setMessage(e.target.value)}
                onKeyUp={handleKeypress}
            />
            <div className="flex justify-center text-black bg-brand items-center rounded-br-md hover:text-white transition-all">
                <button
                className="uppercase px-3 h-full"
                aria-label='Send message'
                onClick={() => {
                    sendMessage();
                }}
                >
                Send
                </button>
            </div>
            </div>
        </div>
    )
}

export default Chat