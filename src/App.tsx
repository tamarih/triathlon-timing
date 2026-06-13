import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Results from './pages/Results';
import TimingStation from './pages/volunteer/TimingStation';
import AdminDashboard from './pages/admin/AdminDashboard';
import Events from './pages/admin/Events';
import Participants from './pages/admin/Participants';
import TimingAdmin from './pages/admin/TimingAdmin';
import AdminResults from './pages/admin/AdminResults';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'admin' | 'volunteer' }) {
  const { user, appUser, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">טוען...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role === 'admin' && appUser?.role !== 'admin') return <Navigate to="/" />;
  if (role === 'volunteer' && appUser?.role !== 'admin' && appUser?.role !== 'volunteer') return <Navigate to="/" />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/results" element={<Results />} />
        <Route path="/volunteer" element={
          <ProtectedRoute role="volunteer"><TimingStation /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
        } />
        <Route path="/admin/events" element={
          <ProtectedRoute role="admin"><Events /></ProtectedRoute>
        } />
        <Route path="/admin/participants" element={
          <ProtectedRoute role="admin"><Participants /></ProtectedRoute>
        } />
        <Route path="/admin/timing" element={
          <ProtectedRoute role="admin"><TimingAdmin /></ProtectedRoute>
        } />
        <Route path="/admin/results" element={
          <ProtectedRoute role="admin"><AdminResults /></ProtectedRoute>
        } />
        <Route path="/admin/reports" element={
          <ProtectedRoute role="admin"><Reports /></ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute role="admin"><Settings /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-center" toastOptions={{
          style: { direction: 'rtl', fontFamily: 'inherit' },
          duration: 3000,
        }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
