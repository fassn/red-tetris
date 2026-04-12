import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { socket } from '../context/socket'
import { useConnectionStatus } from './use-connection-status'
import { PlayerState, PlayState, RoomPlayer, Stack, GameMode } from '../shared/types'
import { isValidName } from '../shared/validation'
import type { OpponentBoard, OpponentBoards } from '../pages/index'

function parseHash(url: string) {
    const hash = url.split('#')[1] || ''
    if (!hash) return {}
    const parts = hash.split('/')
    const room = decodeURIComponent(parts[0])
    if (!isValidName(room)) return {}
    const playing = parts[1] === 'playing'
    return { room, playing }
}

function connectSocket(roomName: string, playerName: string) {
    const sessionId = localStorage.getItem('sessionId')
    socket.auth = sessionId
        ? { sessionId, playerName, roomName }
        : { playerName, roomName }
    socket.connect()
}

export function useGameState() {
    const router = useRouter()
    const { status: connectionStatus, error: connectionError, markConnecting } = useConnectionStatus()

    const [playerName, setPlayerName] = useState('')
    const [isLobby, setIsLobby] = useState(false)
    const [needsPlayerName, setNeedsPlayerName] = useState(false)
    const [playerState, setPlayerState] = useState<PlayerState>({ host: false, playState: PlayState.WAITING })
    const [otherPlayers, setOtherPlayers] = useState<RoomPlayer[]>([])
    const [opponentBoards, setOpponentBoards] = useState<OpponentBoards>({})
    const [gameMode, setGameMode] = useState<GameMode>(GameMode.CLASSIC)
    const [timeRemaining, setTimeRemaining] = useState(-1)

    const isInGame = playerState.playState === PlayState.PLAYING || playerState.playState === PlayState.ENDGAME
    const [backNavigationPending, setBackNavigationPending] = useState(false)

    // Refs for beforePopState callback (avoids stale closures)
    const isInGameRef = useRef(false)
    const isLobbyRef = useRef(false)
    const roomRef = useRef('')

    useEffect(() => { isInGameRef.current = isInGame }, [isInGame])
    useEffect(() => { isLobbyRef.current = isLobby }, [isLobby])

    // Push /#room/playing when game starts, replace with /#room when it ends
    useEffect(() => {
        if (!roomRef.current) return
        if (isInGame) {
            window.history.pushState(null, '', `/#${encodeURIComponent(roomRef.current)}/playing`)
        } else if (isLobby) {
            window.history.replaceState(null, '', `/#${encodeURIComponent(roomRef.current)}`)
        }
    }, [isInGame, isLobby])

    // Try to join a room using stored player name, or show name prompt
    const joinRoom = (room: string) => {
        roomRef.current = room
        const storedName = localStorage.getItem('playerName')
        if (storedName && isValidName(storedName)) {
            setPlayerName(storedName)
            setIsLobby(true)
            markConnecting()
            connectSocket(room, storedName)
        } else {
            setIsLobby(true)
            setNeedsPlayerName(true)
        }
    }

    // Called from name prompt overlay when user submits a name
    const submitPlayerName = (name: string) => {
        localStorage.setItem('playerName', name)
        setPlayerName(name)
        setNeedsPlayerName(false)
        markConnecting()
        connectSocket(roomRef.current, name)
    }

    const cancelNamePrompt = () => {
        setNeedsPlayerName(false)
        setIsLobby(false)
        roomRef.current = ''
        router.push('/')
    }

    useEffect(() => {
        const { room } = parseHash(router.asPath)
        if (room) {
            joinRoom(room)
        }

        const handleHashChange = (url: string) => {
            const { room } = parseHash(url)
            if (room && room !== roomRef.current) {
                joinRoom(room)
            } else if (!room && isLobbyRef.current) {
                socket.disconnect()
                setIsLobby(false)
                setNeedsPlayerName(false)
                setPlayerState({ host: false, playState: PlayState.WAITING })
                setOtherPlayers([])
                setOpponentBoards({})
                setTimeRemaining(-1)
            }
        }

        // Intercept browser back/forward to clean up game/lobby state
        router.beforePopState(() => {
            const { room, playing } = parseHash(window.location.href)

            if (isInGameRef.current && room && !playing) {
                // In-game → back to lobby: show forfeit dialog
                setBackNavigationPending(true)
                window.history.pushState(
                    null, '',
                    `/#${encodeURIComponent(roomRef.current)}/playing`,
                )
                return false
            }

            if (isLobbyRef.current && !room) {
                // Lobby → back to welcome: disconnect
                socket.disconnect()
                setIsLobby(false)
                setNeedsPlayerName(false)
                setPlayerState({ host: false, playState: PlayState.WAITING })
                setOtherPlayers([])
                setOpponentBoards({})
                setTimeRemaining(-1)
            }

            return true
        })

        const handleRoomFull = () => {
            router.push('/?error=roomIsFull')
            setIsLobby(false)
        }

        const handleSession = ({ sessionId, playerId }: { sessionId: string, playerId: string }) => {
            socket.auth = { sessionId }
            localStorage.setItem('sessionId', sessionId)
            socket.playerId = playerId
        }

        const handleNewState = ({ playerState, otherPlayers, gameMode: mode }: { playerState?: PlayerState, otherPlayers?: RoomPlayer[], gameMode?: GameMode }) => {
            if (playerState) {
                setPlayerState(playerState)
                if (playerState.playState === PlayState.WAITING) {
                    setOpponentBoards({})
                    setTimeRemaining(-1)
                }
            }
            if (otherPlayers) {
                setOtherPlayers(otherPlayers)
            }
            if (mode) {
                setGameMode(mode)
            }
        }

        const handleOpponentStack = ({ playerId, playerName, stack }: { playerId: string; playerName: string; stack: Stack[] }) => {
            setOpponentBoards((prev) => ({
                ...prev,
                [playerId]: { playerId, playerName, stack },
            }))
        }

        const handleTimeUpdate = ({ remaining }: { remaining: number }) => {
            setTimeRemaining(remaining)
        }

        const handleGameModeChanged = ({ gameMode }: { gameMode: GameMode }) => {
            setGameMode(gameMode)
        }

        router.events.on('hashChangeComplete', handleHashChange)
        socket.on('roomIsFull', handleRoomFull)
        socket.on('session', handleSession)
        socket.on('newState', handleNewState)
        socket.on('opponentStack', handleOpponentStack)
        socket.on('timeUpdate', handleTimeUpdate)
        socket.on('gameModeChanged', handleGameModeChanged)

        return () => {
            router.beforePopState(() => true)
            router.events.off('hashChangeComplete', handleHashChange)
            socket.off('roomIsFull', handleRoomFull)
            socket.off('session', handleSession)
            socket.off('newState', handleNewState)
            socket.off('opponentStack', handleOpponentStack)
            socket.off('timeUpdate', handleTimeUpdate)
            socket.off('gameModeChanged', handleGameModeChanged)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const navigateHome = () => {
        socket.disconnect()
        setIsLobby(false)
        router.push('/')
    }

    const forfeitGame = () => {
        setBackNavigationPending(false)
        socket.emit('quitGame')
    }

    const cancelBackNavigation = () => {
        setBackNavigationPending(false)
    }

    return {
        playerName,
        isLobby,
        isInGame,
        needsPlayerName,
        playerState,
        otherPlayers,
        opponentBoards,
        gameMode,
        setGameMode,
        timeRemaining,
        connectionStatus,
        connectionError,
        navigateHome,
        forfeitGame,
        backNavigationPending,
        cancelBackNavigation,
        submitPlayerName,
        cancelNamePrompt,
        roomName: roomRef.current,
    }
}
