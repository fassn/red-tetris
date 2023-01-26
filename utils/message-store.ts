/* abstract */ class MessageStore {
    saveMessage(roomName:string, message: Message) {}
    findMessagesForRoom(userId: string) {}
    removeMessagesFromRoom(roomName: string) {}
}

export type Message = {
    author: string,
    message: string
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

    findMessagesForRoom(roomName: string) {
        return this.messages.get(roomName) || []
    }

    removeMessagesFromRoom(roomName: string): void {
        for (let [key, _] of this.messages) {
            if (key === roomName) {
                this.messages.delete(key)
            }
        }
        console.log('after messages removed');
        console.log(this.messages);
    }
}