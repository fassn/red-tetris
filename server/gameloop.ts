import type { TypedServer } from './io-types'
import { SPACING, TILEHEIGHT } from "../shared/config"
import Game from "./game"
import Piece from "./piece"
import Player from "./player"
import { PlayState, RoomPlayer, Stack } from "../shared/types"
import { saveScore } from "./stores/highscore-store"

/** Pre-build per-player otherPlayers lists and broadcast state to all players in a game. */
function broadcastPlayerStates(io: TypedServer, game: Game) {
    const allPlayers: RoomPlayer[] = game.players.map((p) => ({
        playerId: p.id,
        playerName: p.name,
        state: p.socket.data.playerState,
    }))
    for (let i = 0; i < game.players.length; i++) {
        const player = game.players[i]
        const otherPlayers = allPlayers.filter((_, j) => j !== i)
        io.to(player.socket.id).emit('newState', {
            playerState: player.socket.data.playerState,
            otherPlayers,
        })
    }
    // Notify spectators (sockets in the room that are not game players)
    if (game.players.length > 0) {
        const roomName = game.players[0].socket.data.roomName ?? ''
        const gameSocketIds = game.players.map((p) => p.socket.id)
        io.to(roomName).except(gameSocketIds).emit('newState', {
            otherPlayers: allPlayers,
        })
    }
}

export function emitNextPiece(io: TypedServer, game: Game, player: Player, playerPieces: Piece[]) {
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

export function emitStackAndScore(io: TypedServer, game: Game, player: Player, playerStack: Stack[]) {
    const lineCount = game.countFilledLines(playerStack)
    const score = game.addToScore(lineCount, player.id)
    player.linesCleared += lineCount
    io.to(player.socket.id).emit('newStack', { newStack: playerStack, newScore: score, linesCleared: lineCount })

    // Check for level-up after scoring
    const newLevel = game.updateLevel()
    if (newLevel !== null) {
        for (const p of game.players) {
            io.to(p.socket.id).emit('levelUp', { level: newLevel, dropInterval: game.dropInterval })
        }
    }
}

export function broadcastOpponentStack(io: TypedServer, game: Game, player: Player) {
    const roomName = player.socket.data.roomName ?? ''
    io.to(roomName).except(player.socket.id).emit('opponentStack', {
        playerId: player.id,
        playerName: player.name,
        stack: player.stack,
    })
}

export function checkIfPieceHasHit(currentPiece: Piece) {
    return !currentPiece.isActive() && !currentPiece.isDisabled()
}

export function movePieceDown(io: TypedServer, currentPiece: Piece, player: Player, playerStack: Stack[]) {
    const newY = currentPiece.getY() + (TILEHEIGHT + SPACING)
    io.to(player.socket.id).emit('newPosition', newY)

    /* Effectively moves the tetrimino if active && has not hit anything down */
    currentPiece.setY(newY, playerStack)
}

/**
 * Handle end-game when a player tops out.
 * Marks the loser, checks remaining active players, and
 * declares a winner if only one is left standing.
 */
export function emitEndGameToPlayers(io: TypedServer, loser: Player, game: Game) {
    // Mark loser and store final stats for lobby display
    loser.socket.data.playerState.playState = PlayState.ENDGAME
    loser.socket.data.playerState.lastScore = loser.score
    loser.socket.data.playerState.lastLines = loser.linesCleared
    io.to(loser.socket.id).emit('gameOver', { won: false })

    // Count remaining active players
    const activePlayers = game.players.filter(
        (p) => p.socket.data.playerState.playState === PlayState.PLAYING
    )

    if (activePlayers.length === 1) {
        // Last player standing wins
        const winner = activePlayers[0]
        winner.socket.data.playerState.playState = PlayState.ENDGAME
        winner.socket.data.playerState.lastScore = winner.score
        winner.socket.data.playerState.lastLines = winner.linesCleared
        io.to(winner.socket.id).emit('gameOver', { won: true })
    }

    // Broadcast updated states to everyone
    broadcastPlayerStates(io, game)

    // If no active players remain, reset the game
    if (activePlayers.length <= 1) {
        const roomName = loser.socket.data.roomName ?? ''
        for (const player of game.players) {
            if (player.score > 0 && !player.forfeited) {
                saveScore(player.name, player.score, game.gameMode, roomName, game.startedPlayerCount)
            }
        }
        game.reset()
    }
}

/**
 * Handle end of a TIME_ATTACK game when the timer expires.
 * Highest score wins. Ties = all tying players win.
 */
export function emitTimeAttackEnd(io: TypedServer, game: Game) {
    const activePlayers = game.players.filter(
        (p) => p.socket.data.playerState.playState === PlayState.PLAYING
    )
    if (activePlayers.length === 0) return

    const maxScore = Math.max(0, ...activePlayers.map((p) => p.score))

    for (const player of activePlayers) {
        player.socket.data.playerState.playState = PlayState.ENDGAME
        player.socket.data.playerState.lastScore = player.score
        player.socket.data.playerState.lastLines = player.linesCleared
        const won = player.score === maxScore
        io.to(player.socket.id).emit('gameOver', { won })
    }

    // Broadcast updated states to everyone
    broadcastPlayerStates(io, game)

    // Save highscores for all players with score > 0 (excluding forfeited)
    const roomName = activePlayers[0].socket.data.roomName ?? ''
    for (const player of game.players) {
        if (player.score > 0 && !player.forfeited) {
            saveScore(player.name, player.score, game.gameMode, roomName, game.startedPlayerCount)
        }
    }

    game.reset()
}