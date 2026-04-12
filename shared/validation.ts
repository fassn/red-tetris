export const MAX_NAME_LENGTH = 32
export const NAME_PATTERN = /^[a-zA-Z0-9_-]+$/

/** Strip characters not allowed by NAME_PATTERN. */
export function sanitizeName(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '')
}

export function isValidName(name: unknown): name is string {
    return (
        typeof name === 'string' &&
        name.length >= 1 &&
        name.length <= MAX_NAME_LENGTH &&
        NAME_PATTERN.test(name)
    )
}
