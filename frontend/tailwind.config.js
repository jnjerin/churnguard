
module.exports = {
content: ['./index.html',"./src/**/*.{js,ts,jsx,tsx}"],
theme: {
    extend: {
        colors: {
            // ChurnGuard brand colors 
            primary: {
              50: '#dbeafe',  // light blue
              100: '#bfdbfe',
              500: '#7dd3fc', // sky blue
              600: '#0ea5e9',
              700: '#0284c7',
            },
            accent: {
              400: '#facc15', // amber
              500: '#eab308',
            },
            neutral: {
              800: '#1e293b', // slate gray
              900: '#0f172a',
            },
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
          },
          fontFamily: {
            sans: ['Inter', 'system-ui', 'sans-serif'],
          },
          animation: {
            'slide-up': 'slideUp 0.3s ease-out',
            'fade-in': 'fadeIn 0.2s ease-in',
            'bounce-gentle': 'bounceGentle 0.6s ease-out',
          },
          keyframes: {
            slideUp: {
              '0%': { transform: 'translateY(100%)', opacity: '0' },
              '100%': { transform: 'translateY(0)', opacity: '1' },
            },
            fadeIn: {
              '0%': { opacity: '0' },
              '100%': { opacity: '1' },
            },
            bounceGentle: {
              '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
              '40%': { transform: 'translateY(-4px)' },
              '60%': { transform: 'translateY(-2px)' },
            },
          },
    },
},
plugins: [require('./src', '@tailwindcss/forms')],
}
  
