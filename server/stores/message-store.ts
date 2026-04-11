import type { Message } from "../../shared/types"

const MAX_MESSAGES_PER_ROOM = 100

export interface MessageStore {
    saveMessage(roomName: string, message: Message): void
    findMessagesForRoom(roomName: string): Message[]
    removeMessagesFromRoom(roomName: string): void
}

export default class InMemoryMessageStore implements MessageStore {
    messages: Map<string, Message[]>

    constructor() {
        this.messages = new Map()
    }

    saveMessage(roomName: string, message: Message) {
        const messages = this.messages.get(roomName)
        if (messages) {
            messages.push(message)
            // FIFO cap: remove oldest messages when over limit (single splice vs. loop of shift)
            const overflow = messages.length - MAX_MESSAGES_PER_ROOM
            if (overflow > 0) {
                messages.splice(0, overflow)
            }
        } else {
            this.messages.set(roomName, [message])
        }
    }

    findMessagesForRoom(roomName: string) {
        return this.messages.get(roomName) || []
    }

    removeMessagesFromRoom(roomName: string) {
        this.messages.delete(roomName)
    }
}