
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(222.2 47.4% 11.2%)',
					foreground: 'hsl(210 40% 98%)',
					50: 'hsl(222.2 47.4% 95%)',
					100: 'hsl(222.2 47.4% 85%)',
					500: 'hsl(222.2 47.4% 11.2%)',
					900: 'hsl(222.2 47.4% 5%)'
				},
				secondary: {
					DEFAULT: 'hsl(210 40% 96%)',
					foreground: 'hsl(222.2 84% 4.9%)'
				},
				caregrowth: {
					blue: 'hsl(222.2 47.4% 11.2%)',
					green: 'hsl(104 71% 34%)',
					lightblue: 'hsl(222.2 47.4% 95%)',
					lightgreen: 'hsl(104 71% 94%)'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: '#1939B7',
					'primary-foreground': '#FFFFFF',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
				'cal-surface': 'hsl(var(--cal-surface))',
				'cal-surface-hover': 'hsl(var(--cal-surface-hover))',
				'cal-surface-selected': 'hsl(var(--cal-surface-selected))',
				'cal-border': 'hsl(var(--cal-border))',
				'cal-border-selected': 'hsl(var(--cal-border-selected))',
				'cal-today-ring': 'hsl(var(--cal-today-ring))',
				'status-published': 'hsl(var(--status-published))',
				'status-published-bg': 'hsl(var(--status-published-bg))',
				'status-scheduled': 'hsl(var(--status-scheduled))',
				'status-scheduled-bg': 'hsl(var(--status-scheduled-bg))',
				'status-approval': 'hsl(var(--status-approval))',
				'status-approval-bg': 'hsl(var(--status-approval-bg))',
				'status-failed': 'hsl(var(--status-failed))',
				'status-failed-bg': 'hsl(var(--status-failed-bg))',
				'status-draft': 'hsl(var(--status-draft))',
				'status-draft-bg': 'hsl(var(--status-draft-bg))',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
