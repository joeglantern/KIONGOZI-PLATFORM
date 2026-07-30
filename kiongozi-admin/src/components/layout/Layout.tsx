import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ErrorBoundary } from '../ui/ErrorBoundary'
import { useAdminSocket } from '../../hooks/useAdminSocket'

export function Layout() {
  useAdminSocket()
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="p-5 max-w-[1400px] mx-auto">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}
