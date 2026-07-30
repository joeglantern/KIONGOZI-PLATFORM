import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import { useSocketStore } from '../stores/socketStore'

// In dev: connect through Vite's /socket.io proxy → api.kiongozi.org
// In prod: connect directly (VITE_API_URL is the backend's origin)
const WS_URL = import.meta.env.DEV
  ? window.location.origin
  : (import.meta.env.VITE_API_URL || 'https://api.kiongozi.org')

export function useAdminSocket() {
  const { token, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const { setConnected } = useSocketStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !token) return

    // Default transport order (polling first, upgrade to websocket) — starting
    // with websocket fails through proxies that don't forward the upgrade
    const socket = io(WS_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15_000,
      reconnectionAttempts: Infinity,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    // Real-time admin events from the backend
    socket.on('new_user', (data: { id: string; full_name: string }) => {
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast(`New user: ${data.full_name}`, { icon: '👤' })
    })

    socket.on('new_report', (data: { id: string; reason: string }) => {
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast(`New report: ${data.reason}`, { icon: '🚩' })
    })

    socket.on('post_flagged', () => {
      queryClient.invalidateQueries({ queryKey: ['flagged-posts'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    })

    socket.on('stats_update', () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [isAuthenticated, token, queryClient, setConnected])
}
