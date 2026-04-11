type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

function shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel]
}

function formatMessage(level: LogLevel, context: string, message: string): string {
    const timestamp = new Date().toISOString()
    return `${timestamp} [${level.toUpperCase()}] [${context}] ${message}`
}

/** Create a logger scoped to a given context (e.g. room name, module). */
export function createLogger(context: string) {
    return {
        debug: (msg: string, ...args: unknown[]) => {
            if (shouldLog('debug')) console.debug(formatMessage('debug', context, msg), ...args)
        },
        info: (msg: string, ...args: unknown[]) => {
            if (shouldLog('info')) console.log(formatMessage('info', context, msg), ...args)
        },
        warn: (msg: string, ...args: unknown[]) => {
            if (shouldLog('warn')) console.warn(formatMessage('warn', context, msg), ...args)
        },
        error: (msg: string, ...args: unknown[]) => {
            if (shouldLog('error')) console.error(formatMessage('error', context, msg), ...args)
        },
    }
}

/** Default server logger */
export const log = createLogger('server')
