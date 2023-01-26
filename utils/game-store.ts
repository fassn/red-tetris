import { Server } from "socket.io"
import { Game, Player } from "./game"

/* abstract */ class GameStore {
    createOrFindGame(roomName: string, io: Server, players: Player[]) {}
    findGame(roomName: string) {}
    saveGame(roomName: string, game: Game) {}
    removeGameFromRoom(roomName: string) {}
}

export default class InMemoryGameStore extends GameStore {
    games: Map<string, Game>
    // players: Player[]

    constructor() {
        super()
        // this.players = players
        this.games = new Map()
    }

    createOrFindGame(roomName: string, io: Server, players: Player[]): Game | undefined {
        const game = this.games.get(roomName)
        if (!game) {
            this.games.set(roomName, new Game(io, players))
        }
        return this.findGame(roomName)
    }

    findGame(roomName: string): Game | undefined {
        return this.games.get(roomName)
    }

    saveGame(roomName: string, game: Game) {
        this.games.set(roomName, game)
    }

    removeGameFromRoom(roomName: string): void {
        for (let [key, _] of this.games) {
            if (key === roomName) {
                this.games.delete(key)
            }
        }
        console.log('after game removed');
        console.log(this.games);
    }
}