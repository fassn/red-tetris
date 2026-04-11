/** @type {import('tailwindcss').Config} */

module.exports = {
    darkMode: 'class',
    content: [
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: 'var(--brand)',
                    hover: 'var(--brand-hover)',
                    dark: 'var(--brand-dark)',
                    darker: 'var(--brand-darker)',
                    light: 'var(--brand-light)',
                },
                surface: {
                    app: 'var(--surface-app)',
                    card: 'var(--surface-card)',
                    input: 'var(--surface-input)',
                },
                content: {
                    DEFAULT: 'var(--content)',
                    secondary: 'var(--content-secondary)',
                    muted: 'var(--content-muted)',
                    inverse: 'var(--content-inverse)',
                },
                edge: {
                    DEFAULT: 'var(--edge)',
                    subtle: 'var(--edge-subtle)',
                },
                status: {
                    ready: 'var(--status-ready)',
                    playing: 'var(--status-playing)',
                    inactive: 'var(--status-inactive)',
                    muted: 'var(--status-muted)',
                    danger: 'var(--status-danger)',
                },
            },
        },
    },
    plugins: [
        require('tailwind-scrollbar'),
    ],
}