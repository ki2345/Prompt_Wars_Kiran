/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#0a0a0c",
                foreground: "#f8f8f8",
                primary: {
                    DEFAULT: "#00f6ff",
                    dark: "#00b4cc",
                },
                secondary: {
                    DEFAULT: "#ff00e5",
                    dark: "#cc00b4",
                },
                accent: "#7000ff",
                clash: "#ff003c",
            },
            animation: {
                'neon-pulse': 'neon-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 3s ease-in-out infinite',
            },
            keyframes: {
                'neon-pulse': {
                    '0%, 100%': { opacity: 1, textShadow: '0 0 10px #00f6ff, 0 0 20px #00f6ff' },
                    '50%': { opacity: 0.7, textShadow: '0 0 5px #00f6ff' },
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
            },
        },
    },
    plugins: [],
}
