import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { createServer, Server as HttpServer } from 'http'
import { io as Client, Socket as ClientSocket } from 'socket.io-client'
import { createSocketServer } from '../server/create-socket-server'
import InMemorySessionStore from '../server/stores/session-store'
import InMemoryMessageStore from '../server/stores/message-store'
import InMemoryGameStore from '../server/stores/game-store'
import { PlayState, GameMode } from '../shared/types'
import type { ServerToClientEvents, ClientToServerEvents } from '../shared/socket-events'

type TypedClientSocket = ClientSocket<ServerToClientEvents, ClientToServerEvents>

let httpServer: HttpServer
let port: number
let sessionStore: InMemorySessionStore
let messageStore: InMemoryMessageStore
let gameStore: InMemoryGameStore
const clients: TypedClientSocket[] = []

function createClient(auth: Record<string, string>): TypedClientSocket {
    const client = Client(`http://localhost:${port}`, {
        autoConnect: false,
        auth,
    }) as TypedClientSocket
    clients.push(client)
    return client
}

function connectClient(client: TypedClientSocket): Promise<void> {
    return new Promise((resolve, reject) => {
        client.on('connect', () => resolve())
        client.on('connect_error', (err) => reject(err))
        client.connect()
    })
}

function waitForEvent<E extends keyof ServerToClientEvents>(
    client: TypedClientSocket,
    event: E,
    timeout = 2000,
): Promise<Parameters<ServerToClientEvents[E]>> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeout)
        ;(client as any).once(event, (...args: any[]) => {
            clearTimeout(timer)
            resolve(args as Parameters<ServerToClientEvents[E]>)
        })
    })
}

/** Connect a client and wait for both session and initial newState */
async function connectAndWait(client: TypedClientSocket) {
    const sessionP = waitForEvent(client, 'session')
    const stateP = waitForEvent(client, 'newState')
    await connectClient(client)
    const [session] = await sessionP
    const [state] = await stateP
    return { session, state }
}

beforeAll(() => {
    return new Promise<void>((resolve) => {
        sessionStore = new InMemorySessionStore()
        messageStore = new InMemoryMessageStore()
        gameStore = new InMemoryGameStore()

        httpServer = createServer()
        createSocketServer(httpServer, { sessionStore, messageStore, gameStore })

        httpServer.listen(0, () => {
            const addr = httpServer.address()
            port = typeof addr === 'object' && addr ? addr.port : 0
            resolve()
        })
    })
})

afterEach(() => {
    for (const client of clients) {
        if (client.connected) client.disconnect()
    }
    clients.length = 0
})

afterAll(() => {
    return new Promise<void>((resolve) => {
        httpServer.close(() => resolve())
    })
})

describe('Socket.IO Integration', () => {
    describe('Connection & Session', () => {
        it('should assign session on connection', async () => {
            const client = createClient({ playerName: 'Alice', roomName: 'room1' })
            const { session } = await connectAndWait(client)
            expect(session.sessionId).toBeTruthy()
            expect(session.playerId).toBeTruthy()
        })

        it('should reject invalid player name', async () => {
            const client = createClient({ playerName: '', roomName: 'room1' })
            await expect(connectClient(client)).rejects.toThrow('invalid player name')
        })

        it('should reject invalid room name', async () => {
            const client = createClient({ playerName: 'Alice', roomName: '' })
            await expect(connectClient(client)).rejects.toThrow('invalid room name')
        })

        it('should restore session on reconnect', async () => {
            // A second player keeps the room alive so cleanStores doesn't purge sessions
            const bob = createClient({ playerName: 'Bob', roomName: 'room-recon' })
            await connectAndWait(bob)

            const alice = createClient({ playerName: 'Alice', roomName: 'room-recon' })
            const { session: session1 } = await connectAndWait(alice)
            alice.disconnect()
            // Allow time for server-side disconnect handler to save session
            await new Promise((r) => setTimeout(r, 200))

            const alice2 = createClient({ sessionId: session1.sessionId })
            const { session: session2 } = await connectAndWait(alice2)

            expect(session2.sessionId).not.toBe(session1.sessionId) // rotated
            expect(session2.playerId).toBe(session1.playerId)
        })
    })

    describe('Room & Host', () => {
        it('should assign first player as host', async () => {
            const client = createClient({ playerName: 'Alice', roomName: 'room-host' })
            const { state } = await connectAndWait(client)
            expect(state.playerState?.host).toBe(true)
            expect(state.playerState?.playState).toBe(PlayState.WAITING)
        })

        it('should assign second player as non-host', async () => {
            const host = createClient({ playerName: 'Alice', roomName: 'room-host2' })
            await connectAndWait(host)

            const guest = createClient({ playerName: 'Bob', roomName: 'room-host2' })
            const { state } = await connectAndWait(guest)
            expect(state.playerState?.host).toBe(false)
        })

        it('should reassign host when host disconnects', async () => {
            const host = createClient({ playerName: 'Alice', roomName: 'room-rehost' })
            await connectAndWait(host)

            const guest = createClient({ playerName: 'Bob', roomName: 'room-rehost' })
            await connectAndWait(guest)

            const hostChangePromise = waitForEvent(guest, 'newState')
            host.disconnect()
            const [newState] = await hostChangePromise
            expect(newState.playerState?.host).toBe(true)
        })

        it('should include other players in state', async () => {
            const alice = createClient({ playerName: 'Alice', roomName: 'room-others' })
            await connectAndWait(alice)

            // Listen for Alice's state update BEFORE Bob connects
            const aliceStateP = waitForEvent(alice, 'newState')
            const bob = createClient({ playerName: 'Bob', roomName: 'room-others' })
            await connectAndWait(bob)
            const [aliceState] = await aliceStateP

            expect(aliceState.otherPlayers?.length).toBe(1)
            expect(aliceState.otherPlayers?.[0].playerName).toBe('Bob')
        })
    })

    describe('Ready & Game Start', () => {
        it('should update state on setReady', async () => {
            const client = createClient({ playerName: 'Alice', roomName: 'room-ready' })
            await connectAndWait(client)

            const readyPromise = waitForEvent(client, 'newState')
            client.emit('setReady', true)
            const [state] = await readyPromise
            expect(state.playerState?.playState).toBe(PlayState.READY)
        })

        it('should allow host to start game when ready', async () => {
            const host = createClient({ playerName: 'Alice', roomName: 'room-start' })
            await connectAndWait(host)

            host.emit('setReady', true)
            await waitForEvent(host, 'newState')

            const gamePromise = waitForEvent(host, 'newGame')
            host.emit('startGame')
            const [gameData] = await gamePromise

            expect(gameData.newStack).toBeDefined()
            expect(gameData.firstPiece).toBeDefined()
            expect(gameData.secondPiece).toBeDefined()
        })

        it('should prevent non-host from starting', async () => {
            const host = createClient({ playerName: 'Alice', roomName: 'room-nostart' })
            await connectAndWait(host)

            const guest = createClient({ playerName: 'Bob', roomName: 'room-nostart' })
            await connectAndWait(guest)

            guest.emit('startGame')
            await expect(
                waitForEvent(guest, 'newGame', 500)
            ).rejects.toThrow('Timeout')
        })
    })

    describe('Chat', () => {
        it('should broadcast messages to other players', async () => {
            const alice = createClient({ playerName: 'Alice', roomName: 'room-chat' })
            await connectAndWait(alice)

            const bob = createClient({ playerName: 'Bob', roomName: 'room-chat' })
            await connectAndWait(bob)

            const msgPromise = waitForEvent(bob, 'newIncomingMsg')
            alice.emit('createdMessage', { author: 'ignored', message: 'Hello!' })
            const [msg] = await msgPromise

            expect(msg.author).toBe('Alice')
            expect(msg.message).toBe('Hello!')
        })

        it('should not echo message back to sender', async () => {
            const alice = createClient({ playerName: 'Alice', roomName: 'room-echo' })
            await connectAndWait(alice)

            const bob = createClient({ playerName: 'Bob', roomName: 'room-echo' })
            await connectAndWait(bob)

            alice.emit('createdMessage', { author: '', message: 'test' })
            await expect(
                waitForEvent(alice, 'newIncomingMsg', 500)
            ).rejects.toThrow('Timeout')
        })
    })

    describe('Game Mode', () => {
        it('should allow host to change game mode', async () => {
            const host = createClient({ playerName: 'Alice', roomName: 'room-mode' })
            await connectAndWait(host)

            const modePromise = waitForEvent(host, 'gameModeChanged')
            host.emit('setGameMode', GameMode.TIME_ATTACK)
            const [modeData] = await modePromise
            expect(modeData.gameMode).toBe(GameMode.TIME_ATTACK)
        })

        it('should prevent non-host from changing mode', async () => {
            const host = createClient({ playerName: 'Alice', roomName: 'room-mode2' })
            await connectAndWait(host)

            const guest = createClient({ playerName: 'Bob', roomName: 'room-mode2' })
            await connectAndWait(guest)

            guest.emit('setGameMode', GameMode.TIME_ATTACK)
            await expect(
                waitForEvent(guest, 'gameModeChanged', 500)
            ).rejects.toThrow('Timeout')
        })
    })

    describe('Forfeit', () => {
        it('should handle quit and reset player state', async () => {
            const host = createClient({ playerName: 'Alice', roomName: 'room-quit' })
            await connectAndWait(host)

            host.emit('setReady', true)
            await waitForEvent(host, 'newState')
            host.emit('startGame')
            await waitForEvent(host, 'newGame')

            // Set up ALL listeners before emitting quitGame to avoid missing
            // events that arrive in the same packet as resetGame
            const resetPromise = waitForEvent(host, 'resetGame')
            const waitingPromise = new Promise<{ playState: number }>((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('Timeout waiting for WAITING state')), 2000)
                const handler = (state: any) => {
                    if (state.playerState?.playState === PlayState.WAITING) {
                        clearTimeout(timer)
                        ;(host as any).off('newState', handler)
                        resolve(state.playerState)
                    }
                }
                ;(host as any).on('newState', handler)
            })

            host.emit('quitGame')
            await resetPromise
            const playerState = await waitingPromise
            expect(playerState.playState).toBe(PlayState.WAITING)
        })
    })
})
