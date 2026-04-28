import { KeyboardEvent, useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../context/socket";

export type Message = {
    id: string,
    author: string,
    message: string
}

type ChatProps = {
    playerName: string
    messages: Message[]
    onSend: (msg: Message) => void
}

export const nextMsgId = (() => {
    let counter = 0
    return () => `msg-${Date.now()}-${++counter}`
})()

const Chat = ({ playerName, messages, onSend }: ChatProps) => {
    const socket = useContext(SocketContext)
    const [message, setMessage] = useState('')
    const bottomRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        bottomRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' })
    }, [messages])

    const sendMessage = () => {
        const trimmed = message.trim()
        if (!trimmed) return
        const msg: Message = { id: nextMsgId(), author: playerName, message: trimmed }
        socket.emit('createdMessage', { author: playerName, message: trimmed })
        onSend(msg)
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
        <div className='flex flex-col bg-surface-card w-full rounded-lg shadow-xs shadow-brand overflow-hidden flex-1' role='region' aria-label='Chat'>
            <div className='flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-brand' aria-live='polite' aria-relevant='additions'>
            {messages.map((msg) => {
                return (
                <div
                    className="w-full py-2 px-3 border-b border-edge-subtle"
                    key={msg.id}
                >
                    <span className='font-semibold text-brand'>{msg.author}:</span>{' '}
                    <span className='text-content-secondary'>{msg.message}</span>
                </div>
                );
            })}
            <div ref={bottomRef} />
            </div>
            <div className="border-t border-edge w-full flex">
            <input
                id='message_input'
                type="text"
                placeholder="New message..."
                value={message}
                aria-label='Chat message'
                maxLength={500}
                className="py-2.5 px-3 flex-1 text-sm bg-surface-input placeholder:text-content-muted outline-hidden focus:ring-2 focus:ring-inset focus:ring-brand"
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeypress}
            />
            <button
                className="uppercase px-4 text-sm font-semibold bg-brand hover:bg-brand-hover hover:text-content-inverse transition-colors focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-brand"
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