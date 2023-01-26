/* abstract */ class SessionStore {
    findSession(id: string) {}
    saveSession(id: string, session: Session) {}
    findAllSessions() {}
}
export type Session = {
    userId: string
    playerName: string
    roomName: string
}

export default class InMemorySessionStore extends SessionStore {
    sessions: Map<string, Session>

    constructor() {
        super();
        this.sessions = new Map();
    }

    findSession(id: string) {
        return this.sessions.get(id);
    }

    saveSession(id: string, session: Session) {
        this.sessions.set(id, session);
    }

    findAllSessions() {
        return [...this.sessions.values()];
    }
}