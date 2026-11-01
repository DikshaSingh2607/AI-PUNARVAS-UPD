import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { RedZones } from './pages/RedZones';
import { Habitations } from './pages/Habitations';
import { SiteAssessment } from './pages/SiteAssessment';
import { RelocatePlan } from './pages/RelocatePlan';
import { AuditLog } from './pages/AuditLog';

// Protected Route wrapper component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Page transition wrapper component
const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

export const App: React.FC = () => {
  const { initAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Route */}
        <Route
          path="/login"
          element={
            <PageWrapper>
              <Login />
            </PageWrapper>
          }
        />

        {/* Protected Dashboard & Operations Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/"
            element={
              <PageWrapper>
                <Dashboard />
              </PageWrapper>
            }
          />
          <Route
            path="/red-zones"
            element={
              <PageWrapper>
                <RedZones />
              </PageWrapper>
            }
          />
          <Route
            path="/habitations"
            element={
              <PageWrapper>
                <Habitations />
              </PageWrapper>
            }
          />
          <Route
            path="/sites"
            element={
              <PageWrapper>
                <SiteAssessment />
              </PageWrapper>
            }
          />
          <Route
            path="/relocate"
            element={
              <PageWrapper>
                <RelocatePlan />
              </PageWrapper>
            }
          />
          <Route
            path="/audit"
            element={
              <PageWrapper>
                <AuditLog />
              </PageWrapper>
            }
          />
        </Route>

        {/* Catch-all redirect to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

export default App;
