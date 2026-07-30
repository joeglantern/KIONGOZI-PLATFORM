import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Layout } from './components/layout/Layout'
import { useAuthStore } from './stores/authStore'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import ContentPage from './pages/ContentPage'
import AnalyticsPage from './pages/AnalyticsPage'
import AppManagementPage from './pages/AppManagementPage'
import NotificationsPage from './pages/NotificationsPage'
import AuditLogPage from './pages/AuditLogPage'
import SettingsPage from './pages/SettingsPage'
import type { Role } from './types'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function RoleRoute({ children, minRole }: { children: React.ReactNode; minRole: Role }) {
  const { hasRole } = useAuthStore()
  return hasRole(minRole) ? <>{children}</> : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#111112',
            color: '#fafafa',
            border: '1px solid #27272a',
            fontSize: '13px',
            borderRadius: '10px',
            padding: '10px 14px',
          },
          success: { iconTheme: { primary: '#5CB85C', secondary: 'white' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route
            path="/content"
            element={
              <RoleRoute minRole="moderator">
                <ContentPage />
              </RoleRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <RoleRoute minRole="admin">
                <AnalyticsPage />
              </RoleRoute>
            }
          />
          <Route
            path="/app"
            element={
              <RoleRoute minRole="admin">
                <AppManagementPage />
              </RoleRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <RoleRoute minRole="admin">
                <NotificationsPage />
              </RoleRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <RoleRoute minRole="admin">
                <AuditLogPage />
              </RoleRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <RoleRoute minRole="super_admin">
                <SettingsPage />
              </RoleRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
