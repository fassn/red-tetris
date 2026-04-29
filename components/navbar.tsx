import type { ReactNode } from 'react'
import MusicToggle from './music-toggle'
import SoundToggle from './sound-toggle'
import ThemeToggle from './theme-toggle'

interface NavbarProps {
    title?: string
    left?: ReactNode
    actions?: ReactNode
}

const Navbar = ({ title = 'Red Tetris', left, actions }: NavbarProps) => {
    return (
        <header className='flex items-center bg-brand px-4 h-10 shrink-0'>
            <div className='flex-1 flex items-center'>{left}</div>
            <h1 className='text-lg font-bold uppercase tracking-wider'>{title}</h1>
            <div className='flex-1 flex items-center justify-end gap-1'>
                {actions}
                <MusicToggle />
                <SoundToggle />
                <ThemeToggle />
            </div>
        </header>
    )
}

export default Navbar
