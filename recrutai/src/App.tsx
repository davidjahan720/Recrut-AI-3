import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import * as Sentry from '@sentry/react'

const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes)
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/AppLayout'
import { UploadProvider } from '@/contexts/UploadContext'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'

// Lazy-load des pages applicatives — réduit la taille du bundle initial
// (Recharts, Supabase queries, etc. ne sont chargés qu'à l'usage).
const Legal = lazy(() => import('@/pages/Legal'))
const Contestation = lazy(() => import('@/pages/Contestation'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Clients = lazy(() => import('@/pages/Clients'))
const ClientDetail = lazy(() => import('@/pages/ClientDetail'))
const Jobs = lazy(() => import('@/pages/Jobs'))
const JobDetail = lazy(() => import('@/pages/JobDetail'))
const Applications = lazy(() => import('@/pages/Applications'))
const CompareApplications = lazy(() => import('@/pages/CompareApplications'))
const ManagerDashboard = lazy(() => import('@/pages/ManagerDashboard'))
const RecruiterDashboard = lazy(() => import('@/pages/RecruiterDashboard'))
const Rgpd = lazy(() => import('@/pages/Rgpd'))
const SeedData = lazy(() => import('@/pages/SeedData'))

function PageFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full min-h-[40vh] items-center justify-center text-muted-foreground text-sm"
    >
      Chargement…
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <UploadProvider>
      <SentryRoutes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/legal" element={<Suspense fallback={<PageFallback />}><Legal /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={<PageFallback />}><Legal /></Suspense>} />
        <Route path="/accessibilite" element={<Suspense fallback={<PageFallback />}><Legal /></Suspense>} />
        <Route path="/contestation" element={<Suspense fallback={<PageFallback />}><Contestation /></Suspense>} />

        {/* Protected app (pathless layout wrapper) */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Suspense fallback={<PageFallback />}><Dashboard /></Suspense>} />
          <Route path="/clients" element={<Suspense fallback={<PageFallback />}><Clients /></Suspense>} />
          <Route path="/clients/:id" element={<Suspense fallback={<PageFallback />}><ClientDetail /></Suspense>} />
          <Route path="/jobs" element={<Suspense fallback={<PageFallback />}><Jobs /></Suspense>} />
          <Route path="/jobs/:id" element={<Suspense fallback={<PageFallback />}><JobDetail /></Suspense>} />
          <Route path="/applications" element={<Suspense fallback={<PageFallback />}><Applications /></Suspense>} />
          <Route path="/compare" element={<Suspense fallback={<PageFallback />}><CompareApplications /></Suspense>} />
          <Route path="/manager" element={<Suspense fallback={<PageFallback />}><ManagerDashboard /></Suspense>} />

          <Route path="/recruiter" element={<Suspense fallback={<PageFallback />}><RecruiterDashboard /></Suspense>} />
          <Route path="/rgpd" element={<Suspense fallback={<PageFallback />}><Rgpd /></Suspense>} />
          <Route path="/account-manager" element={<Navigate to="/manager" replace />} />
          <Route path="/manager-personal" element={<Navigate to="/manager" replace />} />
          <Route path="/seed" element={<Suspense fallback={<PageFallback />}><SeedData /></Suspense>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </SentryRoutes>
      </UploadProvider>
    </BrowserRouter>
  )
}
