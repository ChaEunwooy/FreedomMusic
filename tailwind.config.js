/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 借鉴图片最真实的灰蓝色调
        'aurora-bg-start': '#f0f4f8',
        'aurora-bg-end': '#d7e3f1',
        'glass-bg': 'rgba(255, 255, 255, 0.4)',
        'glass-border': 'rgba(255, 255, 255, 0.6)',
        'text-main': '#1e293b', 
        'text-sub': '#64748b',  
        'accent-blue': '#3b82f6',
      },
      borderRadius: {
        '4xl': '40px',
        '5xl': '48px',
      }
    },
  },
  plugins: [],
}