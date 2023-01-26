/* abstract */ class MessageStore {
    saveMessage(roomName:string, message: Message) { }
    findMessagesForUser(userId: string) { }
}

export type Message = {
    author: string,
    message: string
    // from: string,
    // to: string
    // userId: string
    // playerName: string
    // roomName: string
}

export default class InMemoryMessageStore extends MessageStore {
    messages: Map<string, Message[]>

    constructor() {
        super();
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

    // saveMessages(roomName: string, messages: Message[]) {
    //     this.messages.set(roomName, messages)
    // }

    findMessagesForRoom(roomName: string) {
        return this.messages.get(roomName) || []
    }
}