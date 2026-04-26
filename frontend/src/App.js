/**
 * CareerBridge — root application component.
 * Sets up routing, theme initialisation, and auth hydration.
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore  from './store/authStore';
import useThemeStore from './store/themeStore';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

import HomePage      from './pages/HomePage';
import JobsPage      from './pages/JobsPage';
import JobDetailPage from './pages/JobDetailPage';
import LoginPage     from './pages/auth/LoginPage';
import RegisterPage  from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

import StudentDashboard from './pages/student/StudentDashboard';
import ProfilePage      from './pages/student/ProfilePage';
import ApplicationsPage from './pages/student/ApplicationsPage';
import SavedJobsPage    from './pages/student/SavedJobsPage';
import ResumeBuilderPage from './pages/student/ResumeBuilderPage';

import EmployerDashboard from './pages/employer/EmployerDashboard';
import PostJobPage       from './pages/employer/PostJobPage';
import EditJobPage       from './pages/employer/EditJobPage';
import ApplicantsPage    from './pages/employer/ApplicantsPage';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers     from './pages/admin/AdminUsers';
import AdminJobs      from './pages/admin/AdminJobs';
import PublicSpacePage from './pages/community/PublicSpacePage';

import AuthGuard from './components/auth/ProtectedRoute';
import RoleGuard from './components/auth/RoleRoute';

function App() {
  const { refreshUser, accessToken } = useAuthStore();
  const { applyStoredTheme }         = useThemeStore();

  useEffect(() => {
    applyStoredTheme();
    if (accessToken) refreshUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* ── Public ── */}
            <Route path="/"          element={<HomePage />} />
            <Route path="/jobs"      element={<JobsPage />} />
            <Route path="/jobs/:id"  element={<JobDetailPage />} />
            <Route path="/login"     element={<LoginPage />} />
            <Route path="/register"  element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/community" element={<PublicSpacePage />} />

            {/* ── Authenticated ── */}
            <Route element={<AuthGuard />}>

              {/* Student */}
              <Route element={<RoleGuard roles={['student']} />}>
                <Route path="/dashboard"   element={<StudentDashboard />} />
                <Route path="/profile"     element={<ProfilePage />} />
                <Route path="/applications" element={<ApplicationsPage />} />
                <Route path="/saved-jobs"  element={<SavedJobsPage />} />
                <Route path="/resume-builder" element={<ResumeBuilderPage />} />
              </Route>

              {/* Employer */}
              <Route element={<RoleGuard roles={['employer']} />}>
                <Route path="/employer/dashboard"        element={<EmployerDashboard />} />
                <Route path="/employer/post-job"         element={<PostJobPage />} />
                <Route path="/employer/edit-job/:id"     element={<EditJobPage />} />
                <Route path="/employer/applicants/:jobId" element={<ApplicantsPage />} />
              </Route>

              {/* Admin */}
              <Route element={<RoleGuard roles={['admin']} />}>
                <Route path="/admin"       element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/jobs"  element={<AdminJobs />} />
              </Route>

            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style   : { borderRadius: '10px', fontFamily: 'Inter, sans-serif' },
        }}
      />
    </Router>
  );
}

export default App;
