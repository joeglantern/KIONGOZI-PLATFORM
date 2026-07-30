import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}

export function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function formatDateTime(s: string): string {
  return new Date(s).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function formatRelativeTime(s: string): string {
  const diff = Date.now() - new Date(s).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(s)
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function truncate(s: string, max = 80): string {
  return s.length > max ? s.slice(0, max) + '…' : s
}
