import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        include: ['__tests__/**/*.test.ts'],
        env: { COUNTDOWN_DELAY_MS: '0' },
    },
})
