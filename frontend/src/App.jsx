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
import PatientsPage from './features/crm/PatientsPage'
import PatientProfile from './features/crm/PatientProfile'
import AppointmentsPage from './features/crm/AppointmentsPage'
import StaffPage from './features/hr/StaffPage'
import ShiftScheduler from './features/hr/ShiftScheduler'
import LeaveApprovalPanel from './features/hr/LeaveApprovalPanel'
import AttendancePage from './features/hr/AttendancePage'
import BillingPage from './features/finance/BillingPage'
import ExpensePage from './features/finance/ExpensePage'
import RevenueSummary from './features/finance/RevenueSummary'
import InventoryPage from './features/inventory/InventoryPage'
import StockAlertPanel from './features/inventory/StockAlertPanel'
import AssetPage from './features/inventory/AssetPage'
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
      <div className="flex-1 flex flex-col overflow-hidden md:mt-0 mt-14">
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

            {/* CRM — all authenticated users */}
            <Route path="/crm/patients" element={<PatientsPage />} />
            <Route path="/crm/patients/:id" element={<PatientProfile />} />
            <Route path="/crm/appointments" element={<AppointmentsPage />} />

            {/* HR — admin only (staff sees /hr/leave) */}
            <Route path="/hr/staff" element={
              <ProtectedRoute allowedRoles={['admin']}><StaffPage /></ProtectedRoute>
            } />
            <Route path="/hr/shifts" element={
              <ProtectedRoute allowedRoles={['admin']}><ShiftScheduler /></ProtectedRoute>
            } />
            <Route path="/hr/leave" element={<LeaveApprovalPanel />} />
            <Route path="/hr/attendance" element={
              <ProtectedRoute allowedRoles={['admin']}><AttendancePage /></ProtectedRoute>
            } />

            {/* Finance — admin only */}
            <Route path="/finance/billing" element={
              <ProtectedRoute allowedRoles={['admin']}><BillingPage /></ProtectedRoute>
            } />
            <Route path="/finance/expenses" element={
              <ProtectedRoute allowedRoles={['admin']}><ExpensePage /></ProtectedRoute>
            } />
            <Route path="/finance/revenue" element={
              <ProtectedRoute allowedRoles={['admin']}><RevenueSummary /></ProtectedRoute>
            } />

            {/* Inventory — admin only */}
            <Route path="/inventory" element={
              <ProtectedRoute allowedRoles={['admin']}><InventoryPage /></ProtectedRoute>
            } />
            <Route path="/inventory/alerts" element={
              <ProtectedRoute allowedRoles={['admin']}><StockAlertPanel /></ProtectedRoute>
            } />
            <Route path="/inventory/assets" element={
              <ProtectedRoute allowedRoles={['admin']}><AssetPage /></ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
