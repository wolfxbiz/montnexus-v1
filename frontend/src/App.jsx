import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './features/auth/ProtectedRoute'
import LoginPage from './features/auth/LoginPage'
import Sidebar from './features/navigation/Sidebar'
import TopBar from './features/navigation/TopBar'
import UserManagementPage from './features/user-management/UserManagementPage'
import DocumentVault from './features/docs/DocumentVault'
import AnalyticsDashboard from './features/analytics/AnalyticsDashboard'
import NotificationPanel from './features/messaging/NotificationPanel'
import ChatbotWidget from './features/messaging/ChatbotWidget'
import DashboardPage from './features/dashboard/DashboardPage'
const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <p className="text-lg font-semibold text-red-500">Access Denied</p>
      <p className="text-sm text-gray-500 mt-1">You do not have permission to view this page.</p>
    </div>
  </div>
)

function AppShell() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden md:mt-0 mt-12">
        <TopBar title="Montnexus" />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <ChatbotWidget />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected shell — any authenticated user */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Admin-only */}
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AnalyticsDashboard />
                </ProtectedRoute>
              }
            />

            {/* All authenticated users */}
            <Route path="/docs" element={<DocumentVault />} />
            <Route path="/notifications" element={<NotificationPanel />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
