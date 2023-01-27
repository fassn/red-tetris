/* abstract */ class SessionStore {
    findSession(id: string) {}
    saveSession(id: string, session: Session) {}
    findAllSessions() {}
    removeSessionsFromRoom(roomName: string) {}
}
export type Session = {
    playerId: string
    playerName: string
    roomName: string
}

export default class InMemorySessionStore extends SessionStore {
    sessions: Map<string, Session>

    constructor() {
        super();
        this.sessions = new Map()
    }

    findSession(id: string) {
        return this.sessions.get(id)
    }

    saveSession(id: string, session: Session) {
        this.sessions.set(id, session)
    }

    findAllSessions() {
        return [...this.sessions.values()]
    }

    removeSessionsFromRoom(roomName: string) {
        for (let [key, value] of this.sessions) {
            if (value.roomName === roomName) {
                this.sessions.delete(key)
            }
        }
        console.log('after sessions removed');
        console.log(this.sessions);
    }
}