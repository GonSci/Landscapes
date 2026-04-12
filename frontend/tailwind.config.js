/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        navy: {
          900: '#0f172a',
        },
        purple: {
          primary: '#667eea',
          secondary: '#764ba2',
        }
      },
      backgroundImage: {
        'gradient-purple': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease',
        fadeInDown: 'fadeInDown 0.6s ease',
        fadeInUp: 'fadeInUp 0.6s ease',
        slideDown: 'slideDown 360ms ease',
        slideInUp: 'slideInUp 0.6s ease',
        pulseSlow: 'pulseSlow 2s ease-in-out infinite',
        warningPulse: 'warningPulse 2s ease-in-out infinite',
        barGrow: 'barGrow 1s ease-out',
        slideIn: 'slideIn 0.3s ease-out',
        tooltipFadeIn: 'tooltipFadeIn 0.2s ease-out',
        postSlideIn: 'postSlideIn 0.35s ease',
        messageFadeIn: 'messageFadeIn 0.3s ease',
        modalFadeIn: 'modalFadeIn 0.25s ease',
        modalSlideUp: 'modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          'from': { opacity: '0', transform: 'translateY(-20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          'from': { transform: 'translateY(-8px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInUp: {
          'from': { opacity: '0', transform: 'translateY(30px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        warningPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.15)', opacity: '0.7' },
        },
        barGrow: {
          'from': { height: '0' },
        },
        slideIn: {
          'from': { opacity: '0', transform: 'translateY(-5px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        tooltipFadeIn: {
          'from': { opacity: '0', transform: 'translateX(-50%) translateY(-5px)' },
          'to': { opacity: '1', transform: 'translateX(-50%) translateY(0)' },
        },
        postSlideIn: {
          'from': { opacity: '0', transform: 'translateY(16px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        messageFadeIn: {
          'from': { opacity: '0', transform: 'translateY(8px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        modalFadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        modalSlideUp: {
          'from': { transform: 'translateY(40px) scale(0.96)', opacity: '0' },
          'to': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
