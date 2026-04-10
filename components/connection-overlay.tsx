import type { ConnectionStatus } from "../hooks/use-connection-status"

type ConnectionOverlayProps = {
    status: ConnectionStatus
    error: string | null
}

const ConnectionOverlay = ({ status, error }: ConnectionOverlayProps) => {
    if (status === 'connected' || status === 'idle') return null

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50' role='dialog' aria-modal='true' aria-label='Connection status'>
            <div className='bg-white rounded-lg shadow-xl p-8 mx-4 max-w-sm text-center' role='alert' aria-live='assertive'>
                {status === 'connecting' && (
                    <>
                        <div className='animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full mx-auto mb-4' aria-hidden='true' />
                        <p className='text-lg font-semibold'>Connecting…</p>
                        <p className='text-neutral-500 text-sm mt-1'>Please wait</p>
                    </>
                )}
                {status === 'disconnected' && (
                    <>
                        <div className='animate-spin h-8 w-8 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4' aria-hidden='true' />
                        <p className='text-lg font-semibold'>Connection lost</p>
                        <p className='text-neutral-500 text-sm mt-1'>Reconnecting…</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div className='h-8 w-8 mx-auto mb-4 text-brand-hover text-3xl' aria-hidden='true'>✕</div>
                        <p className='text-lg font-semibold'>Connection failed</p>
                        <p className='text-neutral-500 text-sm mt-1'>{error || 'Unable to reach the server'}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className='mt-4 px-6 py-2 bg-brand rounded font-semibold uppercase hover:bg-brand-hover hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2'
                        >
                            Retry
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

export default ConnectionOverlay
