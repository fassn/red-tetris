import type { Message } from "../../shared/types"

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
            this.messages.set(roomName, messages)
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