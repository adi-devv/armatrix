/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'arm-black': '#0a0a0a',
        'arm-white': '#f5f5f0',
        'arm-accent': '#e8e0d0',
        'arm-muted': '#666660',
        'arm-border': '#1e1e1e',
        'arm-hover': '#141414',
      },
      fontFamily: {
        'display': ['var(--font-display)', 'serif'],
        'mono': ['var(--font-mono)', 'monospace'],
        'body': ['var(--font-body)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
