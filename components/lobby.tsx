import { ChangeEvent, useContext } from "react"
import { SocketContext } from "../context/socket"
import { GameMode, PlayerState, PlayState, RoomPlayer } from "../shared/types"

type LobbyProps = {
    playerState: PlayerState,
    otherPlayers: RoomPlayer[],
    gameMode: GameMode,
    onToggleMode: (next: GameMode) => void,
}

const Logo = () => (
    <div className='flex h-24 justify-center items-center bg-brand'>
        <h1 className='text-4xl font-bold uppercase tracking-wider'>Red Tetris</h1>
    </div>
)

const PlayerList = ({ otherPlayers }: { otherPlayers: RoomPlayer[] }) => (
    <div className='px-4 py-4'>
        <h2 className='text-lg font-semibold mb-2'>Players</h2>
        {otherPlayers.length === 0 ? (
            <p className='text-content-muted text-sm'>Waiting for players to join…</p>
        ) : (
            <ul className='space-y-1' aria-label='Player list'>
                {otherPlayers.map((p) => (
                    <li key={p.playerId} className='flex items-center justify-between text-sm'>
                        <span>
                            {p.playerName}
                            {p.state.host && <span className='ml-1 text-brand' aria-label='Host'>★</span>}
                        </span>
                        <span className={
                            p.state.playState === PlayState.READY ? 'text-status-ready' :
                            p.state.playState === PlayState.PLAYING ? 'text-status-playing' :
                            p.state.playState === PlayState.ENDGAME ? 'text-status-inactive' :
                            'text-status-muted'
                        } aria-label={`Status: ${PlayState[p.state.playState]}`}>
                            {PlayState[p.state.playState]}
                        </span>
                    </li>
                ))}
            </ul>
        )}
    </div>
)

const HostMenu = ({ otherPlayers, gameMode, onStartGame, onToggleMode }: { otherPlayers: RoomPlayer[], gameMode: GameMode, onStartGame: () => void, onToggleMode: () => void }) => {
    const readyCount = otherPlayers.filter((p) => p.state.playState === PlayState.READY).length

    return (
        <>
            <Logo />
            <PlayerList otherPlayers={otherPlayers} />
            <div className='flex flex-col justify-center px-4 pb-6'>
                <div className='text-center text-lg mb-4'>
                    {readyCount > 0
                        ? `${readyCount} player${readyCount > 1 ? 's' : ''} ready!`
                        : 'Wait for players to be ready or start alone.'}
                </div>
                <div className='border-t-2 border-brand-hover' />
                <div className='flex items-center justify-center gap-3 mt-6'>
                    <span className={`text-sm font-medium ${gameMode === GameMode.CLASSIC ? 'text-content' : 'text-content-muted'}`}>Classic</span>
                    <button
                        onClick={onToggleMode}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden focus:ring-2 focus:ring-brand focus:ring-offset-2 ${gameMode === GameMode.TIME_ATTACK ? 'bg-brand' : 'bg-edge'}`}
                        role='switch'
                        aria-checked={gameMode === GameMode.TIME_ATTACK}
                        aria-label='Toggle game mode'
                    >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${gameMode === GameMode.TIME_ATTACK ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-sm font-medium ${gameMode === GameMode.TIME_ATTACK ? 'text-content' : 'text-content-muted'}`}>Time Attack</span>
                </div>
                <button onClick={onStartGame} className='py-3 w-full max-w-xs self-center text-lg uppercase font-semibold mt-4 bg-brand rounded-sm hover:bg-brand-hover hover:text-content-inverse transition-colors focus:outline-hidden focus:ring-2 focus:ring-brand focus:ring-offset-2'>Start Game</button>
            </div>
        </>
    )
}

const GuestMenu = ({ playerState, otherPlayers, gameMode, onSetReady }: { playerState: PlayerState, otherPlayers: RoomPlayer[], gameMode: GameMode, onSetReady: (e: ChangeEvent<HTMLInputElement>) => void }) => (
    <>
        <Logo />
        <PlayerList otherPlayers={otherPlayers} />
        <div className='flex flex-col text-lg justify-center px-4 pb-6'>
            <div className='text-center mb-2'>Wait for the game leader to start the game!</div>
            <div className='border-t-2 border-brand-hover' />
            <div className='text-center text-sm text-content-secondary mt-4 mb-4'>
                Mode: {gameMode === GameMode.TIME_ATTACK ? '⏱ Time Attack' : '🏆 Classic'}
            </div>
            <div className='flex justify-center mb-4'>
                <label htmlFor='ready'>Ready?</label>
                <input id='ready' name='ready' type='checkbox' checked={playerState.playState === PlayState.READY} className='accent-brand mx-6 w-7' onChange={onSetReady} />
            </div>
        </div>
    </>
)

const Lobby = ({ playerState, otherPlayers, gameMode, onToggleMode }: LobbyProps) => {
    const socket = useContext(SocketContext)

    const setReady = (event: ChangeEvent<HTMLInputElement>) => {
        socket.emit('setReady', event.target.checked)
    }

    const startGame = () => {
        socket.emit('startGame')
    }

    const toggleMode = () => {
        const next = gameMode === GameMode.CLASSIC ? GameMode.TIME_ATTACK : GameMode.CLASSIC
        onToggleMode(next)
        socket.emit('setGameMode', next)
    }

    const anyPlaying = otherPlayers.some((p) => p.state.playState === PlayState.PLAYING)
    const card = 'bg-surface-card rounded-lg shadow-xs shadow-brand overflow-hidden'

    if (playerState.playState === PlayState.PLAYING || playerState.playState === PlayState.ENDGAME) {
        return <div className={card}><Logo /></div>
    }
    if (playerState.host) {
        return <div className={card}><HostMenu otherPlayers={otherPlayers} gameMode={gameMode} onStartGame={startGame} onToggleMode={toggleMode} /></div>
    }
    if (!anyPlaying) {
        return <div className={card}><GuestMenu playerState={playerState} otherPlayers={otherPlayers} gameMode={gameMode} onSetReady={setReady} /></div>
    }
    return (
        <div className={card}>
            <Logo />
            <PlayerList otherPlayers={otherPlayers} />
            <div className='px-4 py-6 text-center text-lg'>A game is on-going. Please wait for it to finish!</div>
        </div>
    )
}

export default Lobby