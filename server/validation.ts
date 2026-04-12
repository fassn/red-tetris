import { GameMode } from '../shared/types'

export { isValidName, NAME_PATTERN } from '../shared/validation'

const MAX_MESSAGE_LENGTH = 500

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
