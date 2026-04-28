import type { PieceProps, PlayerState, Point, RoomPlayer, Stack, Message, GameMode } from "./types"

export interface ServerToClientEvents {
    session: (data: { sessionId: string; playerId: string }) => void
    messages: (messages: Message[]) => void
    roomIsFull: () => void
    newState: (data: { playerState?: PlayerState; otherPlayers?: RoomPlayer[]; gameMode?: GameMode }) => void
    newGame: (data: { newStack: Stack[]; firstPiece: PieceProps; secondPiece: PieceProps }) => void
    newStack: (data: { newStack: Stack[]; newScore: number; linesCleared: number }) => void
    newPosition: (newY: number) => void
    newPiece: (data: { newCurrentPiece: PieceProps; newNextPiece: PieceProps }) => void
    newMoveDown: (newY: number) => void
    newMoveLeft: (newX: number) => void
    newMoveRight: (newX: number) => void
    newPoints: (points: [Point, Point, Point, Point]) => void
    gameCountdown: (data: { count: number }) => void
    gameOver: (data: { won: boolean }) => void
    resetGame: () => void
    newIncomingMsg: (msg: Message) => void
    opponentStack: (data: { playerId: string; playerName: string; stack: Stack[] }) => void
    levelUp: (data: { level: number; dropInterval: number }) => void
    timeUpdate: (data: { remaining: number }) => void
    gameModeChanged: (data: { gameMode: GameMode }) => void
}

export interface ClientToServerEvents {
    setReady: (isReady: boolean) => void
    startGame: () => void
    moveDown: () => void
    moveLeft: () => void
    moveRight: () => void
    rotate: () => void
    quitGame: () => void
    createdMessage: (msg: Message) => void
    setGameMode: (mode: GameMode) => void
}
