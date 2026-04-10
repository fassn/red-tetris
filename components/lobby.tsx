import { ChangeEvent, useContext } from "react"
import { SocketContext } from "../context/socket"
import { PlayerState, PlayState, RoomPlayer } from "../shared/types"

type LobbyProps = {
    playerState: PlayerState,
    otherPlayers: RoomPlayer[]
}

const Logo = () => (
    <div className='flex h-32 justify-center items-center bg-red-400 mx-5 rounded'>
        <h1 className='text-5xl uppercase'>Red Tetris</h1>
    </div>
)

const PlayerList = ({ otherPlayers }: { otherPlayers: RoomPlayer[] }) => (
    <div className='mx-5 mt-4'>
        <h2 className='text-lg font-semibold mb-2'>Players</h2>
        {otherPlayers.length === 0 ? (
            <p className='text-gray-400 text-sm'>Waiting for players to join…</p>
        ) : (
            <ul className='space-y-1'>
                {otherPlayers.map((p) => (
                    <li key={p.playerId} className='flex items-center justify-between text-sm'>
                        <span>
                            {p.playerName}
                            {p.state.host && <span className='ml-1 text-red-400'>★</span>}
                        </span>
                        <span className={
                            p.state.playState === PlayState.READY ? 'text-green-500' :
                            p.state.playState === PlayState.PLAYING ? 'text-blue-500' :
                            p.state.playState === PlayState.ENDGAME ? 'text-gray-400' :
                            'text-gray-300'
                        }>
                            {PlayState[p.state.playState]}
                        </span>
                    </li>
                ))}
            </ul>
        )}
    </div>
)

const HostMenu = ({ otherPlayers, onStartGame }: { otherPlayers: RoomPlayer[], onStartGame: () => void }) => {
    const readyCount = otherPlayers.filter((p) => p.state.playState === PlayState.READY).length

    return (
        <>
            <Logo />
            <PlayerList otherPlayers={otherPlayers} />
            <div className='flex flex-col justify-center'>
                <div className='text-center text-lg mb-4'>
                    {readyCount > 0
                        ? `${readyCount} player${readyCount > 1 ? 's' : ''} ready!`
                        : 'Wait for players to be ready or start alone.'}
                </div>
                <div className='border-t border-2 border-red-500'></div>
                <button onClick={onStartGame} className='py-4 w-full max-w-xs self-center text-xl uppercase mt-10 bg-red-400 rounded hover:text-white transition-all'>Start Game</button>
            </div>
        </>
    )
}

const GuestMenu = ({ playerState, otherPlayers, onSetReady }: { playerState: PlayerState, otherPlayers: RoomPlayer[], onSetReady: (e: ChangeEvent<HTMLInputElement>) => void }) => (
    <>
        <Logo />
        <PlayerList otherPlayers={otherPlayers} />
        <div className='flex flex-col text-lg justify-center'>
            <div className='text-center mb-4'>Wait for the game leader to start the game!</div>
            <div className='border-t border-2 border-red-500'></div>
            <div className='flex justify-center mt-10 mb-4'>
                <label htmlFor='ready'>Ready?</label>
                <input id='ready' name='ready' type='checkbox' checked={playerState.playState === PlayState.READY} className='accent-red-400 mx-6 w-7' onChange={onSetReady} />
            </div>
        </div>
    </>
)

const Lobby = ({ playerState, otherPlayers }: LobbyProps) => {
    const socket = useContext(SocketContext)

    const setReady = (event: ChangeEvent<HTMLInputElement>) => {
        socket.emit('setReady', event.target.checked)
    }

    const startGame = () => {
        socket.emit('startGame')
    }

    const anyPlaying = otherPlayers.some((p) => p.state.playState === PlayState.PLAYING)

    if (playerState.playState === PlayState.PLAYING || playerState.playState === PlayState.ENDGAME) {
        return <Logo />
    }
    if (playerState.host) {
        return <HostMenu otherPlayers={otherPlayers} onStartGame={startGame} />
    }
    if (!anyPlaying) {
        return <GuestMenu playerState={playerState} otherPlayers={otherPlayers} onSetReady={setReady} />
    }
    return (
        <>
            <Logo />
            <PlayerList otherPlayers={otherPlayers} />
            <div className='flex flex-col text-lg justify-center'>
                <div className="text-center mx-4">A game is on-going. Please wait for it to finish!</div>
            </div>
        </>
    )
}

export default Lobby