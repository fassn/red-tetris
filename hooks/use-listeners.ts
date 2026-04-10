import { MutableRefObject, useContext, useEffect } from "react"
import { createEmptyPiece, createEmptyStack } from "../shared/stack"
import { SocketContext } from "../context/socket"
import { PieceProps, Stack, TileProps } from "../shared/types"

type useListenersProps = {
    stack: MutableRefObject<Stack[]>,
    currentPiece: MutableRefObject<PieceProps>,
    nextPiece: MutableRefObject<PieceProps>,
    score: MutableRefObject<number>,
    gameWon: MutableRefObject<boolean>,
    cascadeTiles: MutableRefObject<TileProps[]>,
    getCascadeTilesCalled: MutableRefObject<boolean>,
}

const useListeners = ({ stack, currentPiece, nextPiece, score, gameWon, cascadeTiles, getCascadeTilesCalled }: useListenersProps) => {
    const socket = useContext(SocketContext)
    useEffect(() => {
        const handleNewGame = ({ newStack, firstPiece, secondPiece }: { newStack: Stack[], firstPiece: PieceProps, secondPiece: PieceProps}) => {
            stack.current = newStack
            currentPiece.current = firstPiece
            nextPiece.current = secondPiece
        }

        const handleNewStack = ({ newStack, newScore }: { newStack: Stack[], newScore: number }) => {
            stack.current = newStack
            score.current = newScore
        }

        const handleNewPosition = (newY: number) => {
            currentPiece.current.y = newY
        }

        const handleNewPiece = ({ newCurrentPiece, newNextPiece }: { newCurrentPiece: PieceProps, newNextPiece: PieceProps }) => {
            currentPiece.current = newCurrentPiece
            nextPiece.current = newNextPiece
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

        const handleGameWon = () => {
            gameWon.current = true
        }

        const handleResetGame = () => {
            currentPiece.current = createEmptyPiece()
            nextPiece.current = createEmptyPiece()
            stack.current = createEmptyStack()
            getCascadeTilesCalled.current = false
            cascadeTiles.current = []
            score.current = 0
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
        socket.on('gameWon', handleGameWon)
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
            socket.off('gameWon', handleGameWon)
            socket.off('resetGame', handleResetGame)
        }
    }, [])
}

export default useListeners