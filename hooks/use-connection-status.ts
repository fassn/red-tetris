import { useEffect, useState } from "react"
import { socket } from "../context/socket"

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

function getInitialStatus(): ConnectionStatus {
    if (socket.connected) return 'connected'
    if (socket.active) return 'connecting'
    return 'idle'
}

export function useConnectionStatus() {
    const [status, setStatus] = useState<ConnectionStatus>(getInitialStatus)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const onConnect = () => {
            setStatus('connected')
            setError(null)
        }

        const onDisconnect = (reason: string) => {
            if (reason === 'io client disconnect') {
                // Intentional disconnect (e.g. leaving room) — no overlay
                setStatus('idle')
            } else if (reason === 'io server disconnect') {
                setStatus('error')
                setError('Disconnected by server')
            } else {
                setStatus('disconnected')
            }
        }

        const onConnectError = (err: Error) => {
            setStatus('error')
            setError(err.message)
        }

        const onReconnectAttempt = () => {
            setStatus('connecting')
        }

        const onReconnectFailed = () => {
            setStatus('error')
            setError('Could not reconnect after multiple attempts')
        }

        socket.on('connect', onConnect)
        socket.on('disconnect', onDisconnect)
        socket.on('connect_error', onConnectError)
        socket.io.on('reconnect_attempt', onReconnectAttempt)
        socket.io.on('reconnect_failed', onReconnectFailed)

        return () => {
            socket.off('connect', onConnect)
            socket.off('disconnect', onDisconnect)
            socket.off('connect_error', onConnectError)
            socket.io.off('reconnect_attempt', onReconnectAttempt)
            socket.io.off('reconnect_failed', onReconnectFailed)
        }
    }, [])

    const markConnecting = () => {
        setStatus('connecting')
        setError(null)
    }

    return { status, error, markConnecting }
}
