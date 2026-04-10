import { PlayerState } from "../types"

export interface SessionStore {
    findSession(id: string): Session | undefined
    saveSession(id: string, session: Session): void
    findAllSessions(): Session[]
    removeSessionsFromRoom(roomName: string): void
}

export type Session = {
    playerId: string
    playerName: string
    playerState: PlayerState
    roomName: string
}

export default class InMemorySessionStore implements SessionStore {
    sessions: Map<string, Session>

    constructor() {
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
        for (const [key, value] of this.sessions) {
            if (value.roomName === roomName) {
                this.sessions.delete(key)
            }
        }
    }
}