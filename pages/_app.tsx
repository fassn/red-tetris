import '../styles/globals.css'
import type { AppProps } from 'next/app'
import ErrorBoundary from '../components/error-boundary'
import { socket, SocketContext } from '../context/socket'
import { ThemeProvider } from '../context/theme'
import { SoundProvider } from '../context/sound'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SoundProvider>
          <SocketContext.Provider value={socket}>
            <Component {...pageProps} />
          </SocketContext.Provider>
        </SoundProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default MyApp
