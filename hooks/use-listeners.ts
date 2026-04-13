import { MutableRefObject, useContext, useEffect } from "react"
import { createEmptyPiece, createEmptyStack } from "../shared/stack"
import { SocketContext } from "../context/socket"
import { PieceProps, Stack, TileProps } from "../shared/types"
import type { SoundName } from "../utils/sound-manager"

type useListenersProps = {
    stack: MutableRefObject<Stack[]>,
    currentPiece: MutableRefObject<PieceProps>,
    setNextPiece: (piece: PieceProps) => void,
    setScore: (score: number) => void,
    setLevel: (level: number) => void,
    setTotalLines: React.Dispatch<React.SetStateAction<number>>,
    gameWon: MutableRefObject<boolean>,
    cascadeTiles: MutableRefObject<TileProps[]>,
    getCascadeTilesCalled: MutableRefObject<boolean>,
    playSound: (name: SoundName) => void,
}

const useListeners = ({ stack, currentPiece, setNextPiece, setScore, setLevel, setTotalLines, gameWon, cascadeTiles, getCascadeTilesCalled, playSound }: useListenersProps) => {
    const socket = useContext(SocketContext)
    useEffect(() => {
        const handleNewGame = ({ newStack, firstPiece, secondPiece }: { newStack: Stack[], firstPiece: PieceProps, secondPiece: PieceProps}) => {
            stack.current = newStack
            currentPiece.current = firstPiece
            setNextPiece(secondPiece)
        }

        const handleNewStack = ({ newStack, newScore, linesCleared }: { newStack: Stack[], newScore: number, linesCleared: number }) => {
            stack.current = newStack
            setScore(newScore)
            if (linesCleared > 0) {
                setTotalLines(prev => prev + linesCleared)
                if (linesCleared >= 4) {
                    playSound('tetris')
                } else {
                    playSound('clear')
                }
            }
        }

        const handleNewPosition = (newY: number) => {
            currentPiece.current.y = newY
        }

        const handleNewPiece = ({ newCurrentPiece, newNextPiece }: { newCurrentPiece: PieceProps, newNextPiece: PieceProps }) => {
            currentPiece.current = newCurrentPiece
            setNextPiece(newNextPiece)
        }

        const handleMoveDown = (newY: number) => {
            currentPiece.current.y = newY
        }

        const handleMoveLeft = (newX: number) => {
            currentPiece.current.x = newX
        }

        const handleMoveRight = (newX: number) => {
            currentPiece.current.x = newX
        }

        const handleNewPoints = (newPoints: PieceProps['points']) => {
            currentPiece.current.points = newPoints
        }

        const handleGameOver = ({ won }: { won: boolean }) => {
            gameWon.current = won
        }

        const handleLevelUp = ({ level: newLevel }: { level: number }) => {
            setLevel(newLevel)
        }

        const handleResetGame = () => {
            currentPiece.current = createEmptyPiece()
            setNextPiece(createEmptyPiece())
            stack.current = createEmptyStack()
            getCascadeTilesCalled.current = false
            cascadeTiles.current = []
            setScore(0)
            setLevel(0)
            setTotalLines(0)
            gameWon.current = false
        }

        socket.on('newGame', handleNewGame)
        socket.on('newStack', handleNewStack)
        socket.on('newPosition', handleNewPosition)
        socket.on('newPiece', handleNewPiece)
        socket.on('newMoveDown', handleMoveDown)
        socket.on('newMoveLeft', handleMoveLeft)
        socket.on('newMoveRight', handleMoveRight)
        socket.on('newPoints', handleNewPoints)
        socket.on('gameOver', handleGameOver)
        socket.on('levelUp', handleLevelUp)
        socket.on('resetGame', handleResetGame)

        return () => {
            socket.off('newGame', handleNewGame)
            socket.off('newStack', handleNewStack)
            socket.off('newPosition', handleNewPosition)
            socket.off('newPiece', handleNewPiece)
            socket.off('newMoveDown', handleMoveDown)
            socket.off('newMoveLeft', handleMoveLeft)
            socket.off('newMoveRight', handleMoveRight)
            socket.off('newPoints', handleNewPoints)
            socket.off('gameOver', handleGameOver)
            socket.off('levelUp', handleLevelUp)
            socket.off('resetGame', handleResetGame)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
}

export default useListeners