import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Keep dark mode enabled
  theme: {
    extend: {
      // Consolidate all skin colors under the main `colors` key
      colors: {
        skin: {
          // Backgrounds
          'card': 'var(--bg-card)',
          'input': 'var(--input-bg)',
          'button': 'var(--button-bg)',
          // Gradients
          'gradient-start': 'var(--bg-gradient-start)',
          'gradient-end': 'var(--bg-gradient-end)',
          // Texts
          'primary': 'var(--text-primary)',
          'secondary': 'var(--text-secondary)',
          'link': 'var(--link-color)',
          'button-text': 'var(--button-text)',
          'input-text': 'var(--input-text)',
          'placeholder': 'var(--input-placeholder)',
          // Borders
          'input-border': 'var(--input-border)',
        }
      },
      // Remove original definitions from textColor, backgroundColor, etc.
      // Keep other extensions like backgroundImage
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
export default config 