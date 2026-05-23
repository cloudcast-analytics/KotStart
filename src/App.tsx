import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import ContractNewPage from './pages/ContractNewPage'
import ContractDetailPage from './pages/ContractDetailPage'
import ContractRenewPage from './pages/ContractRenewPage'
import InspectionNewPage from './pages/InspectionNewPage'
import PropertiesPage from './pages/PropertiesPage'
import AccountPage from './pages/AccountPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/contracts/new" element={<ProtectedRoute><ContractNewPage /></ProtectedRoute>} />
      <Route path="/contracts/:id/renew" element={<ProtectedRoute><ContractRenewPage /></ProtectedRoute>} />
      <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetailPage /></ProtectedRoute>} />
      <Route path="/inspections/new" element={<ProtectedRoute><InspectionNewPage /></ProtectedRoute>} />
      <Route path="/properties" element={<ProtectedRoute><PropertiesPage /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
