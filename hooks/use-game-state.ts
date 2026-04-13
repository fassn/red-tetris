import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { socket } from '../context/socket'
import { useConnectionStatus } from './use-connection-status'
import { PlayerState, PlayState, RoomPlayer, Stack, GameMode } from '../shared/types'
import { isValidName } from '../shared/validation'

export type OpponentBoard = {
    playerId: string
    playerName: string
    stack: Stack[]
}

export type OpponentBoards = Record<string, OpponentBoard>

function connectSocket(roomName: string, playerName: string) {
    const sessionId = localStorage.getItem('sessionId')
    socket.auth = sessionId
        ? { sessionId, playerName, roomName }
        : { playerName, roomName }
    socket.connect()
}

export function useGameState(roomName: string) {
    const router = useRouter()
    const { status: connectionStatus, error: connectionError, markConnecting } = useConnectionStatus()

    const [playerName, setPlayerName] = useState('')
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
    const roomNameRef = useRef(roomName)
    // True when we pushed a /playing entry (so router.back returns to /room/name)
    const pushedGameEntryRef = useRef(false)

    useEffect(() => { isInGameRef.current = isInGame }, [isInGame])
    useEffect(() => { roomNameRef.current = roomName }, [roomName])

    // Push /room/name/playing when game starts; navigate back when it ends.
    useEffect(() => {
        if (!roomName) return
        const encoded = encodeURIComponent(roomName)
        if (isInGame && !window.location.pathname.endsWith('/playing')) {
            pushedGameEntryRef.current = true
            router.push(`/room/${encoded}/playing`, undefined, { shallow: true }).catch(() => {})
        } else if (!isInGame && window.location.pathname.endsWith('/playing')) {
            if (pushedGameEntryRef.current) {
                pushedGameEntryRef.current = false
                router.back()
            } else {
                // Direct URL entry — no lobby entry to go back to
                router.replace(`/room/${encoded}`, undefined, { shallow: true }).catch(() => {})
            }
        }
    }, [isInGame, roomName, router])

    const submitPlayerName = (name: string) => {
        localStorage.setItem('playerName', name)
        setPlayerName(name)
        setNeedsPlayerName(false)
        markConnecting()
        connectSocket(roomName, name)
    }

    const cancelNamePrompt = () => {
        setNeedsPlayerName(false)
        router.push('/')
    }

    useEffect(() => {
        // Connect on mount: check for stored player name
        const storedName = localStorage.getItem('playerName')
        if (storedName && isValidName(storedName)) {
            setPlayerName(storedName)
            markConnecting()
            connectSocket(roomName, storedName)
        } else {
            setNeedsPlayerName(true)
        }

        // Intercept browser back: only need to handle game → lobby (forfeit dialog).
        // Lobby → welcome is handled naturally by page unmount.
        router.beforePopState(() => {
            if (isInGameRef.current && !window.location.pathname.endsWith('/playing')) {
                setBackNavigationPending(true)
                const encoded = encodeURIComponent(roomNameRef.current)
                window.history.pushState(
                    { __N: true, url: `/room/${encoded}/playing`, as: `/room/${encoded}/playing`, options: {} },
                    '',
                    `/room/${encoded}/playing`,
                )
                return false
            }
            return true
        })

        const handleRoomFull = () => {
            router.push('/?error=roomIsFull')
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

        socket.on('roomIsFull', handleRoomFull)
        socket.on('session', handleSession)
        socket.on('newState', handleNewState)
        socket.on('opponentStack', handleOpponentStack)
        socket.on('timeUpdate', handleTimeUpdate)
        socket.on('gameModeChanged', handleGameModeChanged)

        return () => {
            socket.disconnect()
            localStorage.removeItem('sessionId')
            router.beforePopState(() => true)
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
    }
}
