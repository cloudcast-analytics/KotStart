import { lazy, Suspense, type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ContractNewPage = lazy(() => import('./pages/ContractNewPage'))
const ContractDetailPage = lazy(() => import('./pages/ContractDetailPage'))
const ContractRenewPage = lazy(() => import('./pages/ContractRenewPage'))
const InspectionNewPage = lazy(() => import('./pages/InspectionNewPage'))
const InspectionDetailPage = lazy(() => import('./pages/InspectionDetailPage'))
const PropertiesPage = lazy(() => import('./pages/PropertiesPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const InspectionReviewPage = lazy(() => import('./pages/InspectionReviewPage'))
const InspectionStudentPage = lazy(() => import('./pages/InspectionStudentPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))

function PageFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-sm font-semibold text-slate-500">Laden...</p>
    </div>
  )
}

function ProtectedPage({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/inspection/student/:token" element={<InspectionStudentPage />} />
        <Route path="/" element={<ProtectedPage><DashboardPage /></ProtectedPage>} />
        <Route path="/contracts/new" element={<ProtectedPage><ContractNewPage /></ProtectedPage>} />
        <Route path="/contracts/:id/renew" element={<ProtectedPage><ContractRenewPage /></ProtectedPage>} />
        <Route path="/contracts/:id" element={<ProtectedPage><ContractDetailPage /></ProtectedPage>} />
        <Route path="/inspections/new" element={<ProtectedPage><InspectionNewPage /></ProtectedPage>} />
        <Route path="/inspections/review/:contractId" element={<ProtectedPage><InspectionReviewPage /></ProtectedPage>} />
        <Route path="/inspections/:id" element={<ProtectedPage><InspectionDetailPage /></ProtectedPage>} />
        <Route path="/properties" element={<ProtectedPage><PropertiesPage /></ProtectedPage>} />
        <Route path="/account" element={<ProtectedPage><AccountPage /></ProtectedPage>} />
        <Route path="/settings" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
