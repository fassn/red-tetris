import { GameMode } from '../shared/types'

const MAX_NAME_LENGTH = 32
const MAX_MESSAGE_LENGTH = 500
const NAME_PATTERN = /^[a-zA-Z0-9_-]+$/

export function isValidName(name: unknown): name is string {
    return (
        typeof name === 'string' &&
        name.length >= 1 &&
        name.length <= MAX_NAME_LENGTH &&
        NAME_PATTERN.test(name)
    )
}

export function isValidMessage(message: unknown): message is string {
    return (
        typeof message === 'string' &&
        message.trim().length >= 1 &&
        message.length <= MAX_MESSAGE_LENGTH
    )
}

export function isValidGameMode(mode: unknown): mode is GameMode {
    return mode === GameMode.CLASSIC || mode === GameMode.TIME_ATTACK
}
