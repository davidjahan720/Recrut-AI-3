import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import * as Sentry from '@sentry/react'

const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes)
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/AppLayout'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Clients from '@/pages/Clients'
import ClientDetail from '@/pages/ClientDetail'
import Jobs from '@/pages/Jobs'
import JobDetail from '@/pages/JobDetail'
import Applications from '@/pages/Applications'
import CompareApplications from '@/pages/CompareApplications'
import ManagerDashboard from '@/pages/ManagerDashboard'
import RecruiterDashboard from '@/pages/RecruiterDashboard'
import AccountManagerDashboard from '@/pages/AccountManagerDashboard'
import ManagerPersonalDashboard from '@/pages/ManagerPersonalDashboard'
import SeedData from '@/pages/SeedData'

export default function App() {
  return (
    <BrowserRouter>
      <SentryRoutes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />

        {/* Protected app (pathless layout wrapper) */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/compare" element={<CompareApplications />} />
          <Route path="/manager" element={<ManagerDashboard />} />

          <Route path="/recruiter" element={<RecruiterDashboard />} />
          <Route path="/account-manager" element={<AccountManagerDashboard />} />
          <Route path="/manager-personal" element={<ManagerPersonalDashboard />} />
          <Route path="/seed" element={<SeedData />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </SentryRoutes>
    </BrowserRouter>
  )
}
