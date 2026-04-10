/** @type {import('tailwindcss').Config} */
const colors = require('./shared/colors.js')

module.exports = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: colors.brand,
                surface: colors.surface,
                status: colors.status,
            },
        },
    },
    plugins: [
        require('tailwind-scrollbar'),
    ],
}