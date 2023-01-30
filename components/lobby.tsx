import { ChangeEvent, useContext } from "react"
import { SocketContext } from "../context/socket"
import { PlayerState, PlayState } from "../utils/types"

type LobbyProps = {
    playerState: PlayerState,
    otherPlayerState: PlayerState
}

const Lobby = ({ playerState, otherPlayerState}: LobbyProps) => {
    const socket = useContext(SocketContext)

    const setReady = (event: ChangeEvent<HTMLInputElement>) => {
        socket.emit('setReady', event.target.checked)
    }

    const startGame = () => {
        socket.emit('startGame')
    }

    const HostMenu = () => {
        return (
            <>
                <Logo />
                <div className='flex flex-col justify-center'>
                    <div className='text-center text-lg mb-4'>{otherPlayerState.playState === PlayState.READY ? 'Your opponent is ready !' : 'Wait for your opponent to be ready or start a game alone.'}</div>
                    <div className='border-t border-2 border-red-500'></div>
                    <button onClick={startGame} className='py-4 w-72 self-center text-xl uppercase mt-10 bg-red-400 rounded hover:text-white transition-all'>Start Game</button>
                </div>
            </>
        )
    }

    const GuestMenu = () => {
        return (
            <>
                <Logo />
                <div className='flex flex-col text-lg justify-center'>
                    <div className='text-center mb-4'>Wait for the game leader to start the game !</div>
                    <div className='border-t border-2 border-red-500'></div>
                    <div className='flex justify-center mt-10 mb-4'>
                        <label htmlFor='ready'>Ready?</label>
                        <input id='ready' name='ready' type='checkbox' checked={playerState.playState === PlayState.READY} className='accent-red-400 mx-6 w-7' onChange={setReady} />
                    </div>
                </div>
            </>
        )
    }

    const Logo = () => {
        return (
            <div className='flex h-32 justify-center items-center bg-red-400 mx-5 rounded'>
                <h1 className='text-5xl uppercase'>Red Tetris</h1>
            </div>
        )
    }

    if (playerState.playState === PlayState.PLAYING || playerState.playState === PlayState.ENDGAME) {
        return <Logo />
    }
    if (playerState.host === true) {
        return <HostMenu />
    }
    if (playerState.host === false && otherPlayerState.playState !== PlayState.PLAYING) {
        return <GuestMenu />
    }
    if (playerState.host === false && otherPlayerState.playState === PlayState.PLAYING) {
        return (
            <>
                <Logo />
                <div className='flex flex-col text-lg justify-center'>
                    <div className="text-center mx-4">A game is on-going. Please wait for it to finish !</div>
                </div>
            </>
        )
    }
    return <></>
}

export default Lobby