import ThemeToggle from './theme-toggle'

const Footer = () => {
    return (
        <footer className='flex w-full h-10 shrink-0 bg-brand px-4 justify-between items-center z-10'>
            <a href='https://github.com/fassn/red-tetris' target='_blank' rel='noopener noreferrer' className='text-sm hover:underline' aria-label='GitHub repository'>
                GitHub
            </a>
            <div className='text-center uppercase text-sm'>© 2026 fassn</div>
            <ThemeToggle />
        </footer>
    )
}

export default Footer