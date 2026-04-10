import '../styles/globals.css'
import type { AppProps } from 'next/app'
import ErrorBoundary from '../components/error-boundary'
import { socket, SocketContext } from '../context/socket'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <SocketContext.Provider value={socket}>
        <Component {...pageProps} />
      </SocketContext.Provider>
    </ErrorBoundary>
  )
}

export default MyApp
