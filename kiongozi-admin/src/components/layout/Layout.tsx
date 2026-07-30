import { useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { useAdminSocket } from '../../hooks/useAdminSocket'
import { useUiStore } from '../../stores/uiStore'
import { useSocketStore } from '../../stores/socketStore'

export function Layout() {
  useAdminSocket()

  const { mobileSidebarOpen, setMobileSidebarOpen, connectionAlerts } = useUiStore()
  const connected = useSocketStore(s => s.connected)

  // Track connection state changes and fire toasts
  const prevConnected = useRef<boolean | null>(null)
  const everConnected = useRef(false)

  useEffect(() => {
    if (!connectionAlerts) {
      prevConnected.current = connected
      if (connected) everConnected.current = true
      return
    }

    // First time connecting — mark it, no toast
    if (connected && !everConnected.current) {
      everConnected.current = true
      prevConnected.current = true
      return
    }

    // State changed
    if (prevConnected.current !== null && connected !== prevConnected.current) {
      if (connected) {
        toast.dismiss('ws-offline')
        toast.success('Back online', {
          id: 'ws-online',
          duration: 3000,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
            fontSize: '13px',
          },
        })
      } else if (everConnected.current) {
        toast.error('Connection lost — retrying…', {
          id: 'ws-offline',
          duration: Infinity,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
            fontSize: '13px',
          },
        })
      }
    }

    prevConnected.current = connected
    if (connected) everConnected.current = true
  }, [connected, connectionAlerts])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-5 max-w-[1400px] mx-auto">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}
