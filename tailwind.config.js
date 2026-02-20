/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    light: '#10b981',
                    DEFAULT: '#047857',
                    dark: '#064e3b',
                },
                bg: {
                    app: '#f4f7f6',
                    surface: '#ffffff',
                    hover: '#f0fdf4'
                },
                accent: '#f59e0b'
            },
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
