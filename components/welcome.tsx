import { useRouter } from "next/router"
import { FormEvent } from "react"

interface FormData {
    room_name: { value: string },
    player_name: { value: string }
}

const Welcome = () => {
    const router = useRouter()

    const onSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const target = event.target as EventTarget & FormData

        router.push(`/#${target.room_name.value}[${target.player_name.value}]`)
    }

    return (
        <main className='min-h-screen flex flex-grow flex-col justify-center items-center py-16 px-0'>
        <h1 className='text-center m-0 leading-[1.15] text-[4rem]'>
            Welcome to Red Tetris!
        </h1>
        <form className='flex flex-col w-96 m-16 px-6 pt-16 pb-8 outline shadow-md shadow-red-500 drop-shadow-lg outline-red-500 rounded' onSubmit={onSubmit} action=''>
            <div className='flex my-3'>
                <label className='w-1/3 self-center text-center' htmlFor='room_name'>Room name</label>
                <input className='w-2/3 h-10 px-3 outline-1 outline rounded' type='text' id='room_name' name='room_name' required></input>
            </div>
            <div className='flex my-3'>
                <label className='w-1/3 self-center text-center' htmlFor='player_name'>Player name</label>
                <input className='w-2/3 h-10 px-3 outline-1 outline rounded' type='text' id='player_name' name='player_name' required></input>
            </div>
            <button className='mt-16 p-3 w-full bg-red-400 rounded uppercase' type='submit'>Start/Join room</button>
        </form>
    </main>
    )
}

export default Welcome