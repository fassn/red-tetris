import type { Server as IOServer } from 'socket.io'
import { SPACING, TILEHEIGHT } from "./config"
import Game from "./game"
import Piece from "./piece"
import Player from "./player"
import { PlayState, Stack } from "./types"

export function emitNextPiece(io: IOServer, game: Game, player: Player, playerPieces: Piece[]) {
    const newCurrentPiece = game.getPieceProps(playerPieces[0])
    const newNextPiece = game.getPieceProps(playerPieces[1])
    io.to(player.socket.id).emit('newPiece', { newCurrentPiece, newNextPiece })
}

export function updatePiecesStack(playerPieces: Piece[], game: Game) {
    playerPieces.shift()
    if (playerPieces.length === 1) {
        const randomProps = game.getRandomPieceProps()
        for (const player of game.players) {
            player.pieces.push(new Piece(randomProps))
        }
    }
}

export function emitStackAndScore(io: IOServer, game: Game, player: Player, playerStack: Stack[]) {
    const lineCount = game.countFilledLines(playerStack)
    const score = game.addToScore(lineCount, player.id)
    io.to(player.socket.id).emit('newStack', { newStack: playerStack, newScore: score })
}

export function checkIfPieceHasHit(currentPiece: Piece) {
    return !currentPiece.isActive() && !currentPiece.isDisabled()
}

export function movePieceDown(io: IOServer, currentPiece: Piece, player: Player, playerStack: Stack[]) {
    const newY = currentPiece.getY() + (TILEHEIGHT + SPACING)
    io.to(player.socket.id).emit('newPosition', newY)

    /* Effectively moves the tetrimino if active && has not hit anything down */
    currentPiece.setY(newY, playerStack)
}

export function emitEndGameToPlayers(io: IOServer, player: Player, otherPlayer: Player | undefined) {
    player.socket.data.playerState.playState = PlayState.ENDGAME

    /* Send the good news to the other player */
    if (otherPlayer) {
        io.to(otherPlayer.socket.id).emit('gameWon')
        otherPlayer.socket.data.playerState.playState = PlayState.ENDGAME
        io.to(otherPlayer.socket.id).emit('newState', { playerState: otherPlayer.socket.data.playerState, otherPlayerState: player.socket.data.playerState.playState })
    }

    /* Send the bad news to the current player */
    io.to(player.socket.id).emit('newState', { playerState: player.socket.data.playerState, otherPlayerState: otherPlayer?.socket.data.playerState })
}