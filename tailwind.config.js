/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Primary font for UI - DM Sans (exceptionally readable, easy on eyes)
        'sans': ['DM Sans', 'SF Pro Display', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        // Display font for headings - Space Grotesk (modern, friendly, distinctive)
        'display': ['Space Grotesk', 'DM Sans', 'SF Pro Display', 'system-ui', 'sans-serif'],
        // Monospace font for code - JetBrains Mono (beautiful and readable)
        'mono': ['JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      letterSpacing: {
        'extra-wide': '0.1em',
        'ultra-wide': '0.15em',
      },
      lineHeight: {
        'relaxed-plus': '1.75',
        'loose-plus': '2',
      },
    },
  },
  plugins: [],
};
