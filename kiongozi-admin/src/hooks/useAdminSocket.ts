import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import { useSocketStore } from '../stores/socketStore'

const WS_URL = import.meta.env.DEV
  ? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
  : (import.meta.env.VITE_API_URL || 'https://api.kiongozi.org').replace(/^https?/, s => s === 'https' ? 'wss' : 'ws')

type SocketEvent =
  | { type: 'new_user'; data: { id: string; full_name: string } }
  | { type: 'new_report'; data: { id: string; reason: string } }
  | { type: 'post_flagged'; data: { id: string } }
  | { type: 'stats_update'; data: Record<string, number> }
  | { type: 'ping' }

const WS_ENABLED = import.meta.env.VITE_WS_ENABLED === 'true'

export function useAdminSocket() {
  const { token, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const setConnected = useSocketStore(s => s.setConnected)
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)

  useEffect(() => {
    if (!WS_ENABLED || !isAuthenticated || !token) return

    // `mounted` is scoped to this effect closure — set to false on cleanup
    // so that onclose never schedules a retry after unmount (fixes React StrictMode
    // double-invoke and avoids reconnect loops when the backend has no WS endpoint)
    let mounted = true
    let everOpened = false

    function connect() {
      const socket = new WebSocket(`${WS_URL}/ws/admin?token=${token}`)
      ws.current = socket

      socket.onopen = () => {
        everOpened = true
        attemptRef.current = 0
        setConnected(true)
      }

      socket.onmessage = (event: MessageEvent) => {
        let msg: SocketEvent
        try {
          msg = JSON.parse(event.data as string)
        } catch {
          return
        }

        switch (msg.type) {
          case 'new_user':
            queryClient.invalidateQueries({ queryKey: ['stats'] })
            queryClient.invalidateQueries({ queryKey: ['users'] })
            toast(`New user: ${msg.data.full_name}`, { icon: '👤' })
            break
          case 'new_report':
            queryClient.invalidateQueries({ queryKey: ['stats'] })
            queryClient.invalidateQueries({ queryKey: ['reports'] })
            toast(`New report: ${msg.data.reason}`, { icon: '🚩' })
            break
          case 'post_flagged':
            queryClient.invalidateQueries({ queryKey: ['flagged-posts'] })
            queryClient.invalidateQueries({ queryKey: ['stats'] })
            break
          case 'stats_update':
            queryClient.invalidateQueries({ queryKey: ['stats'] })
            break
          case 'ping':
            socket.send(JSON.stringify({ type: 'pong' }))
            break
        }
      }

      socket.onclose = () => {
        setConnected(false)
        // Only retry if:
        // 1. The effect is still mounted (not cleaned up by React)
        // 2. The connection was ever established (don't retry if server has no WS)
        // 3. We haven't exceeded the retry cap
        if (!mounted || !everOpened || attemptRef.current >= 5) return
        const delay = Math.min(1000 * 2 ** attemptRef.current, 30_000)
        attemptRef.current += 1
        reconnectTimeout.current = setTimeout(connect, delay)
      }

      socket.onerror = () => {
        socket.close()
      }
    }

    connect()

    return () => {
      mounted = false
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
      ws.current?.close()
      ws.current = null
    }
  }, [isAuthenticated, token, queryClient])
}
