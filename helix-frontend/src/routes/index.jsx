import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'

// Layouts
import AppLayout from '../layouts/AppLayout'
import AuthLayout from '../layouts/AuthLayout'

// Auth pages
import LoginPage from '../pages/Auth/LoginPage'
import ForgotPasswordPage from '../pages/Auth/ForgotPasswordPage'
import ResetPasswordPage from '../pages/Auth/ResetPasswordPage'
import LandingPage from '../pages/Landing/LandingPage'
import ResearcherApplicationPage from '../pages/Auth/ResearcherApplicationPage'

// Protected pages
import DashboardPage from '../pages/Dashboard/DashboardPage'
import PatientListPage from '../pages/Patients/PatientListPage'
import PatientRegisterPage from '../pages/Patients/PatientRegisterPage'
import PatientEditPage from '../pages/Patients/PatientEditPage'
import PatientProfilePage from '../pages/Patients/PatientProfilePage'
import AdminListPage from '../pages/Admin/AdminListPage'
import SettingsPage from '../pages/Settings/SettingsPage'
import ReportHistoryPage from '../pages/Reports/ReportHistoryPage'
import ReportCreatorPage from '../pages/Reports/ReportCreatorPage'
import ReportSettingsPage from '../pages/Reports/ReportSettingsPage'
import ReportPrintPage from '../pages/Reports/ReportPrintPage'

// Visits module (direct visit detail view)
import VisitDetailPage from '../pages/Visits/VisitDetailPage'

// Route guards
import RequireAuth from './RequireAuth'

/**
 * Application router
 *
 * Route tree:
 * /                     → redirect to /dashboard (if auth) or /login
 * /login                → LoginPage (public)
 * /register             → RegisterPage (public)
 * /forgot-password      → ForgotPasswordPage (public) — Phase 1
 * /reset-password       → ResetPasswordPage (public) — Phase 1
 *
 * /dashboard            → DashboardPage (all roles)
 * /patients             → Patient module (all roles)
 * /patients/:id         → Patient profile (all roles)
 * /patients/new         → Register patient (Admin+)
 * /patients/:id/edit    → Edit patient (Admin+)
 * /admin-management     → Admin CRUD (Super Admin only)
 * /settings             → Settings (all roles)
 *
 * /unauthorized         → 403 page
 */
export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* ── Public / Auth routes ──────────────────────────────── */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* ── Researcher Application — standalone full-screen ────── */}
        <Route path="/register/apply" element={<ResearcherApplicationPage />} />

        {/* ── Protected app routes ──────────────────────────────── */}
        <Route
          element={
            <RequireAuth roles={[]}>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Patient module — Phase 3 & 4 */}
          <Route path="/patients" element={<PatientListPage />} />
          <Route
            path="/patients/new"
            element={
              <RequireAuth roles={['ADMIN', 'SUPER_ADMIN']}>
                <PatientRegisterPage />
              </RequireAuth>
            }
          />
          <Route path="/patients/:id" element={<PatientProfilePage />} />
          <Route
            path="/patients/:id/edit"
            element={
              <RequireAuth roles={['ADMIN', 'SUPER_ADMIN']}>
                <PatientEditPage />
              </RequireAuth>
            }
          />

          {/* Visits route alias — redirect to patients register */}
          <Route path="/visits" element={<Navigate to="/patients" replace />} />

          {/* Direct visit detail view */}
          <Route path="/visits/:visitId" element={<VisitDetailPage />} />

          {/* Admin management — Super Admin and Admin access */}
          <Route
            path="/admin-management"
            element={
              <RequireAuth roles={['SUPER_ADMIN', 'ADMIN']}>
                <AdminListPage />
              </RequireAuth>
            }
          />

          {/* Onco Receipt Module */}
          <Route
            path="/reports"
            element={
              <RequireAuth roles={['ADMIN', 'SUPER_ADMIN']}>
                <ReportHistoryPage />
              </RequireAuth>
            }
          />
          <Route
            path="/reports/new"
            element={
              <RequireAuth roles={['ADMIN', 'SUPER_ADMIN']}>
                <ReportCreatorPage />
              </RequireAuth>
            }
          />
          <Route
            path="/reports/edit/:id"
            element={
              <RequireAuth roles={['ADMIN', 'SUPER_ADMIN']}>
                <ReportCreatorPage />
              </RequireAuth>
            }
          />
          <Route
            path="/reports/settings"
            element={
              <RequireAuth roles={['ADMIN', 'SUPER_ADMIN']}>
                <ReportSettingsPage />
              </RequireAuth>
            }
          />

          {/* Settings */}
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Full-screen Report Print / View Page */}
        <Route
          path="/reports/print/:id"
          element={
            <RequireAuth roles={['ADMIN', 'SUPER_ADMIN']}>
              <ReportPrintPage />
            </RequireAuth>
          }
        />

        {/* ── Unauthorized ──────────────────────────────────────── */}
        <Route
          path="/unauthorized"
          element={
            <div className="min-h-screen flex items-center justify-center bg-surface-base">
              <div className="text-center">
                <div className="text-4xl font-bold text-brand-navy mb-2">403</div>
                <p className="text-ink-secondary mb-4">You don't have permission to access this page.</p>
                <Link to="/dashboard" className="text-brand-blue hover:text-brand-blue-dark text-sm font-medium">
                  ← Back to dashboard
                </Link>
              </div>
            </div>
          }
        />

        {/* ── 404 ──────────────────────────────────────────────── */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center bg-surface-base">
              <div className="text-center">
                <div className="text-4xl font-bold text-brand-navy mb-2">404</div>
                <p className="text-ink-secondary mb-4">Page not found.</p>
                <Link to="/dashboard" className="text-brand-blue hover:text-brand-blue-dark text-sm font-medium">
                  ← Back to dashboard
                </Link>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
