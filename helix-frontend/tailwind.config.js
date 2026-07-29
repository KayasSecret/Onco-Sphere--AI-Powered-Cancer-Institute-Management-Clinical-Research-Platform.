/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy:  'var(--color-navy)',
          'navy-dark':  'var(--color-navy-dark)',
          'navy-light': 'var(--color-navy-light)',
          blue:  'var(--color-blue)',
          'blue-dark':  'var(--color-blue-dark)',
          'blue-light': 'var(--color-blue-light)',
          light: 'var(--color-light)',
          'light-dark': 'var(--color-light-dark)',
          'light-light':'var(--color-light-light)',
        },

        // ── Surface / Background ─────────────────────────────────────────
        surface: {
          base:    'var(--surface-base)',
          card:    'var(--surface-card)',
          hover:   'var(--surface-hover)',
          border:  'var(--surface-border)',
        },

        // ── Ink / Text ───────────────────────────────────────────────────
        ink: {
          primary:   'var(--ink-primary)',
          secondary: 'var(--ink-secondary)',
          disabled:  'var(--ink-disabled)',
          inverse:   'var(--ink-inverse)',
        },

        // ── Status Colors ────────────────────────────────────────────────
        // Used ONLY as dots, badges, or thin left-borders — never full fills
        status: {
          active:      '#2E9E7A',   // Active / stable
          'active-bg': '#EBF7F4',
          attention:   '#C9973A',   // Needs attention
          'attention-bg': '#FEF3E2',
          critical:    '#B84C42',   // Overdue / critical
          'critical-bg': '#FDF0EF',
          inactive:    '#6B7280',   // Inactive / discharged
          'inactive-bg': '#F3F4F6',
        },
      },

      // ── Typography ───────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // 7-step type scale (clinical density)
        'xs':   ['0.75rem',  { lineHeight: '1rem' }],
        'sm':   ['0.8125rem',{ lineHeight: '1.25rem' }],
        'base': ['0.9375rem',{ lineHeight: '1.5rem' }],
        'lg':   ['1.0625rem',{ lineHeight: '1.625rem' }],
        'xl':   ['1.1875rem',{ lineHeight: '1.75rem' }],
        '2xl':  ['1.375rem', { lineHeight: '2rem' }],
        '3xl':  ['1.75rem',  { lineHeight: '2.25rem' }],
      },

      // ── Spacing / Sidebar ────────────────────────────────────────────
      width: {
        'sidebar-open':   '240px',
        'sidebar-closed': '64px',
      },

      // ── Shadows ──────────────────────────────────────────────────────
      // Soft, low-opacity only — no dramatic drop shadows
      boxShadow: {
        'xs':  '0 1px 2px rgba(26,31,54,0.06)',
        'sm':  '0 1px 4px rgba(26,31,54,0.08)',
        'md':  '0 2px 8px rgba(26,31,54,0.10)',
        'lg':  '0 4px 12px rgba(26,31,54,0.12)',
        'card':'0 1px 3px rgba(26,31,54,0.08), 0 1px 2px rgba(26,31,54,0.06)',
      },

      // ── Border Radius ────────────────────────────────────────────────
      borderRadius: {
        'sm': '0.375rem',  // 6px  — inputs, badges
        'md': '0.5rem',    // 8px  — buttons
        'lg': '0.75rem',   // 12px — cards (PRIMARY)
        'xl': '1rem',      // 16px — modals, sheets
      },

      // ── Transitions ──────────────────────────────────────────────────
      transitionDuration: {
        'sidebar': '200ms',
        'fast':    '150ms',
      },
      transitionTimingFunction: {
        'ease-clinical': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      // ── Keyframes / Animations ───────────────────────────────────────
      // Functional only — no decorative scroll animations
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'skeleton-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
      },
      animation: {
        'fade-in':        'fade-in 150ms ease-out',
        'skeleton-pulse': 'skeleton-pulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
