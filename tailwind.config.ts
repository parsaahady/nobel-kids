import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#2c2926',
        cream: '#fffaf4',
        rose: '#f3d8dc',
        mint: '#dcecdf',
        butter: '#f6e6b8',
        sky: '#d9e8f4',
        cocoa: '#6f4f43'
      },
      fontFamily: { sans: ['var(--font-vazir)', 'Tahoma', 'sans-serif'] },
      boxShadow: { soft: '0 18px 50px rgba(89, 68, 56, .10)' }
    }
  },
  plugins: []
};
export default config;
