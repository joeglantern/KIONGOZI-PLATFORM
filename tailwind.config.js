/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Civic/Climate Theme Extension
        civic: {
          green: {
            DEFAULT: "#2E7D32", // Forest Green
            light: "#4CAF50",
            dark: "#1B5E20",
          },
          earth: {
            DEFAULT: "#795548", // Brown
            light: "#D7CCC8",
            dark: "#3E2723",
          },
          clay: {
            DEFAULT: "#D84315", // Burnt Orange
            light: "#FFCCBC",
          }
        },
        // Kiongozi Platform Brand Theme Colors
        'brand-primary': '#1b2432',
        'brand-orange': '#FF6633',
        'brand-orange-hover': '#e85520',
        'brand-orange-muted': '#d99253',
        'brand-purple': '#c5b0d9',
        'brand-blue': '#b3d3e0',
        'brand-cream': '#f9f7f4',
        'brand-gray': '#f3f3f3',
        'surface-paper': '#FDFCF0',
        'surface-dark': '#111110',
        'surface-darker': '#0a0a0a',
        'border-warm': '#e0ddd5',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Kiongozi Platform Radii
        base: '1rem',
        card: '2rem',
        pill: '9999px',
      },
      boxShadow: {
        soft: '0 10px 30px -10px rgba(0, 0, 0, 0.05)',
        float: '0 20px 40px -15px rgba(0, 0, 0, 0.1)',
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "var(--font-roboto)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        syne: ["var(--font-syne)", "Arial Black", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fadeIn": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "page-enter": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fadeIn": "fadeIn 0.3s ease-in-out forwards",
        "scale-in": "scale-in 0.2s ease-out forwards",
        "page-enter": "page-enter 0.4s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
