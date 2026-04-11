import { PlayerState } from "../../shared/types"

const SESSION_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface SessionStore {
    findSession(id: string): Session | undefined
    saveSession(id: string, session: Session): void
    findAllSessions(): Session[]
    removeSessionsFromRoom(roomName: string): void
    removeSession(id: string): void
}

export type Session = {
    playerId: string
    playerName: string
    playerState: PlayerState
    roomName: string
    savedAt?: number
}

export default class InMemorySessionStore implements SessionStore {
    sessions: Map<string, Session>
    private cleanupTimer: ReturnType<typeof setInterval>

    constructor() {
        this.sessions = new Map()
        // Periodically evict expired sessions
        this.cleanupTimer = setInterval(() => this.evictExpired(), 60 * 60 * 1000)
    }

    findSession(id: string) {
        const session = this.sessions.get(id)
        if (session && session.savedAt && Date.now() - session.savedAt > SESSION_TTL_MS) {
            this.sessions.delete(id)
            return undefined
        }
        return session
    }

    saveSession(id: string, session: Session) {
        this.sessions.set(id, { ...session, savedAt: Date.now() })
    }

    findAllSessions() {
        return [...this.sessions.values()]
    }

    removeSession(id: string) {
        this.sessions.delete(id)
    }

    removeSessionsFromRoom(roomName: string) {
        for (const [key, value] of this.sessions) {
            if (value.roomName === roomName) {
                this.sessions.delete(key)
            }
        }
    }

    private evictExpired() {
        const now = Date.now()
        for (const [key, session] of this.sessions) {
            if (session.savedAt && now - session.savedAt > SESSION_TTL_MS) {
                this.sessions.delete(key)
            }
        }
    }

    destroy() {
        clearInterval(this.cleanupTimer)
    }
}