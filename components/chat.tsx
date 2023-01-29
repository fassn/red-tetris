import { KeyboardEvent, useContext, useEffect, useState } from "react";
import { SocketContext } from "../context/socket";
import { BOARDHEIGHT } from "../utils/config";

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
        socket.on('messages', (messages) => {
            setMessages(messages)
        })

        socket.on('newIncomingMsg', (msg: Message) => {
            setMessages((currentMsg) => [
                ...currentMsg,
                { author: msg.author, message: msg.message }
            ])
        })
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
        <div className='flex flex-col justify-end bg-white min-w-[33%] rounded-md shadow-sm shadow-red-500 shad'>
            <div className={`h-[${BOARDHEIGHT - 41}px] rounded-t-md scrollbar-thin scrollbar-thumb-red-400`}>
            {messages.map((msg, i) => {
                return (
                <div
                    className="w-full text-red-900 py-1 px-2 border-b border-red-100"
                    key={i}
                >
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
                className="text-red-700 placeholder-red-700 outline-none py-2 px-2 rounded-bl-md flex-1"
                onChange={(e) => setMessage(e.target.value)}
                onKeyUp={handleKeypress}
            />
            <div className="flex justify-center text-black bg-red-400 items-center rounded-br-md hover:text-white transition-all">
                <button
                className="uppercase px-3 h-full"
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