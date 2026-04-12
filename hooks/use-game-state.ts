import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { socket } from '../context/socket'
import { useConnectionStatus } from './use-connection-status'
import { PlayerState, PlayState, RoomPlayer, Stack, GameMode } from '../shared/types'
import { isValidName } from '../shared/validation'
import type { OpponentBoard, OpponentBoards } from '../pages/index'

function parseHash(url: string) {
    const hash = url.split('#')[1] || ''
    const separatorIndex = hash.indexOf('/')
    if (separatorIndex === -1) return {}
    const room = decodeURIComponent(hash.slice(0, separatorIndex))
    const playerName = decodeURIComponent(hash.slice(separatorIndex + 1))
    if (!isValidName(room) || !isValidName(playerName)) return {}
    return { room, playerName }
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
    const playerNameRef = useRef('')

    useEffect(() => { isInGameRef.current = isInGame }, [isInGame])
    useEffect(() => { isLobbyRef.current = isLobby }, [isLobby])

    useEffect(() => {
        const { room, playerName: name } = parseHash(router.asPath)
        if (room && name) {
            roomRef.current = room
            playerNameRef.current = name
            setPlayerName(name)
            setIsLobby(true)
            markConnecting()
            connectSocket(room, name)
        }

        const handleHashChange = (url: string) => {
            const { room, playerName: name } = parseHash(url)
            if (room && name) {
                roomRef.current = room
                playerNameRef.current = name
                setPlayerName(name)
                setIsLobby(true)
                markConnecting()
                connectSocket(room, name)
            }
        }

        // Intercept browser back/forward to clean up game/lobby state
        router.beforePopState(() => {
            const { room } = parseHash(window.location.href)

            if (isInGameRef.current && !room) {
                // In-game → back: show forfeit dialog instead of navigating
                setBackNavigationPending(true)
                window.history.pushState(
                    null, '',
                    `/#${encodeURIComponent(roomRef.current)}/${encodeURIComponent(playerNameRef.current)}`,
                )
                return false
            }

            if (isLobbyRef.current && !room) {
                // Lobby → back: disconnect and return to welcome
                socket.disconnect()
                setIsLobby(false)
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
    }
}
