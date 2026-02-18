/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Quicksand", "sans-serif"],
            },
            colors: {
                primary: {
                    DEFAULT: "#C66408",
                    hover: "#B35C07",
                    tint: "#FFEEDB",
                },
            },
        },
    },
    plugins: [],
};
