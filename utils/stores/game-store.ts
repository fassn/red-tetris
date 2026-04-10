import type { TypedServer } from "../socket-types"
import Game from "../game"
import Player from "../player"

export interface GameStore {
    create(roomName: string, io: TypedServer, players: Player[]): Game
    findGame(roomName: string): Game | undefined
    saveGame(roomName: string, game: Game): void
    removeGameFromRoom(roomName: string): void
}

export default class InMemoryGameStore implements GameStore {
    games: Map<string, Game>

    constructor() {
        this.games = new Map()
    }

    create(roomName: string, io: TypedServer, players: Player[]): Game {
        if (!this.games.has(roomName)) {
            this.games.set(roomName, new Game(io, players))
        }
        return this.games.get(roomName)!
    }

    findGame(roomName: string): Game | undefined {
        return this.games.get(roomName)
    }

    saveGame(roomName: string, game: Game) {
        this.games.set(roomName, game)
    }

    removeGameFromRoom(roomName: string) {
        this.games.delete(roomName)
    }
}