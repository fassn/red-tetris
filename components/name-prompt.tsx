import { FormEvent, useCallback, useEffect, useRef } from 'react'
import { NAME_PATTERN, sanitizeName } from '../shared/validation'

interface NamePromptProps {
    roomName: string
    onSubmit: (name: string) => void
    onCancel: () => void
}

const NamePrompt = ({ roomName, onSubmit, onCancel }: NamePromptProps) => {
    const dialogRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    // Focus trap + Escape handling
    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return
        const focusableSelector = 'button, input, [tabindex]:not([tabindex="-1"])'

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel()
                return
            }
            if (e.key !== 'Tab') return
            const focusable = dialog.querySelectorAll<HTMLElement>(focusableSelector)
            if (focusable.length === 0) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault()
                last.focus()
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault()
                first.focus()
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [onCancel])

    const sanitize = useCallback((e: React.FormEvent<HTMLInputElement>) => {
        const input = e.currentTarget
        const cleaned = sanitizeName(input.value)
        if (cleaned !== input.value) input.value = cleaned
    }, [])

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const name = sanitizeName(inputRef.current?.value || '')
        if (!name) return
        onSubmit(name)
    }

    return (
        <div
            ref={dialogRef}
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
            role='dialog'
            aria-modal='true'
            aria-labelledby='name-prompt-title'
            onClick={onCancel}
        >
            <form
                className='bg-surface-card rounded-lg shadow-lg p-6 max-w-sm mx-4 w-full'
                onClick={(e) => e.stopPropagation()}
                onSubmit={handleSubmit}
            >
                <h2 id='name-prompt-title' className='text-lg font-semibold mb-2'>
                    Join &ldquo;{roomName}&rdquo;
                </h2>
                <p className='text-content-secondary text-sm mb-4'>
                    Enter a player name to join this room.
                </p>
                <input
                    ref={inputRef}
                    className='w-full h-10 px-3 bg-surface-input outline-1 outline-solid outline-edge rounded-sm focus:outline-hidden focus:ring-2 focus:ring-brand'
                    type='text'
                    name='player_name'
                    required
                    maxLength={32}
                    pattern={NAME_PATTERN.source}
                    title='Letters, numbers, hyphens and underscores only'
                    placeholder='Player name'
                    onInput={sanitize}
                />
                <div className='flex gap-3 justify-end mt-4'>
                    <button
                        type='button'
                        onClick={onCancel}
                        className='px-4 py-2 text-sm font-medium rounded-sm border border-edge hover:bg-surface-input transition-colors'
                    >
                        Cancel
                    </button>
                    <button
                        type='submit'
                        className='px-4 py-2 text-sm font-semibold rounded-sm bg-brand text-content-inverse hover:bg-brand-hover transition-colors'
                    >
                        Join
                    </button>
                </div>
            </form>
        </div>
    )
}

export default NamePrompt
