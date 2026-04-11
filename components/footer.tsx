import ThemeToggle from './theme-toggle'
import SoundToggle from './sound-toggle'

const Footer = () => {
    return (
        <footer className='flex w-full h-10 shrink-0 bg-brand px-4 justify-between items-center z-10'>
            <div className='w-8' />
            <div className='text-center uppercase text-sm'>© 2026 fassn</div>
            <div className='flex items-center gap-1'>
                <SoundToggle />
                <ThemeToggle />
            </div>
        </footer>
    )
}

export default Footer