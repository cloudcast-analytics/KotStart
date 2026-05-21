import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import ContractNewPage from './pages/ContractNewPage'
import ContractDetailPage from './pages/ContractDetailPage'
import ContractRenewPage from './pages/ContractRenewPage'
import InspectionNewPage from './pages/InspectionNewPage'
import PropertiesPage from './pages/PropertiesPage'
import AccountPage from './pages/AccountPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/contracts/new" element={<ContractNewPage />} />
      <Route path="/contracts/:id/renew" element={<ContractRenewPage />} />
      <Route path="/contracts/:id" element={<ContractDetailPage />} />
      <Route path="/inspections/new" element={<InspectionNewPage />} />
      <Route path="/properties" element={<PropertiesPage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
