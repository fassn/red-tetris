import ThemeToggle from './theme-toggle'

const Footer = () => {
    return (
        <footer className='flex w-full h-14 bg-brand px-4 justify-between items-center'>
            <div className='w-8' />
            <div className='text-center uppercase text-sm'>© 2026 fassn</div>
            <ThemeToggle />
        </footer>
    )
}

export default Footer