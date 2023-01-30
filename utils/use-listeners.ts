import { MutableRefObject, useContext, useEffect } from "react"
import { initPiece, initStack } from "../components/game-client"
import { SocketContext } from "../context/socket"
import { PieceProps, Stack, TileProps } from "./types"

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
        socket.on('newGame', ({ newStack, firstPiece, secondPiece }: { newStack: Stack[], firstPiece: PieceProps, secondPiece: PieceProps}) => {
            stack.current = newStack
            currentPiece.current = firstPiece
            nextPiece.current = secondPiece
        })

        socket.on('newStack', ({ newStack, newScore }: { newStack: Stack[], newScore: number }) => {
            stack.current = newStack
            score.current = newScore
        })

        socket.on('newPosition', (newY) => {
            currentPiece.current.y = newY
        })

        socket.on('newPiece', ({ newCurrentPiece, newNextPiece }: { newCurrentPiece: PieceProps, newNextPiece: PieceProps }) => {
            currentPiece.current = newCurrentPiece
            nextPiece.current = newNextPiece
        })

        socket.on('newMoveDown', (newY) => {
            currentPiece.current.y = newY
        })

        socket.on('newMoveLeft', (newX) => {
            currentPiece.current.x = newX
        })

        socket.on('newMoveRight', (newX) => {
            // currentPiece.x = newX
            currentPiece.current.x = newX
        })

        socket.on('newPoints', (newPoints) => {
            // currentPiece.points = newPoints
            currentPiece.current.points = newPoints
        })

        socket.on('gameWon', () => {
            gameWon.current = true
        })

        socket.on('resetGame', () => {
            currentPiece.current = initPiece()
            nextPiece.current = initPiece()
            stack.current = initStack()
            getCascadeTilesCalled.current = false
            cascadeTiles.current = []
            score.current = 0
            gameWon.current = false
        })
    }, [])
}

export default useListeners