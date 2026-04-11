import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLogger, log } from '../server/logger'

describe('logger', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('creates a scoped logger with all levels', () => {
        const logger = createLogger('test-ctx')
        expect(logger.debug).toBeTypeOf('function')
        expect(logger.info).toBeTypeOf('function')
        expect(logger.warn).toBeTypeOf('function')
        expect(logger.error).toBeTypeOf('function')
    })

    it('formats messages with timestamp, level, and context', () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
        const logger = createLogger('my-room')
        logger.info('Hello world')
        expect(spy).toHaveBeenCalledOnce()
        const msg = spy.mock.calls[0][0] as string
        expect(msg).toMatch(/\d{4}-\d{2}-\d{2}T/)
        expect(msg).toContain('[INFO]')
        expect(msg).toContain('[my-room]')
        expect(msg).toContain('Hello world')
    })

    it('error level uses console.error', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const logger = createLogger('ctx')
        logger.error('Something broke')
        expect(spy).toHaveBeenCalledOnce()
        expect((spy.mock.calls[0][0] as string)).toContain('[ERROR]')
    })

    it('warn level uses console.warn', () => {
        const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const logger = createLogger('ctx')
        logger.warn('Watch out')
        expect(spy).toHaveBeenCalledOnce()
        expect((spy.mock.calls[0][0] as string)).toContain('[WARN]')
    })

    it('exports a default server logger', () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
        log.info('server boot')
        expect(spy).toHaveBeenCalledOnce()
        expect((spy.mock.calls[0][0] as string)).toContain('[server]')
    })

    it('passes extra arguments through', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const logger = createLogger('ctx')
        const err = new Error('test')
        logger.error('Failed:', err)
        expect(spy).toHaveBeenCalledWith(expect.any(String), err)
    })
})
