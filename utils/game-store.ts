/* abstract */ class SessionStore {
    findSession(id: string) {}
    saveSession(id: string, session: string) {}
    findAllSessions() {}
}

export default class GameStore extends SessionStore {
    constructor() {
        super()
        //
    }
}