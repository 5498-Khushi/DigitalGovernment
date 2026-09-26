import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Navbar from './components/Navbar';
import NotificationToast from './components/NotificationToast';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';

import CitizenDashboard from './pages/citizen/Dashboard';
import Services from './pages/citizen/Services';
import ServiceDetail from './pages/citizen/ServiceDetail';
import TokenPage from './pages/citizen/TokenPage';
import Notifications from './pages/citizen/Notifications';

import StaffDashboard from './pages/staff/StaffDashboard';

import AdminDashboard from './pages/admin/AdminDashboard';
import ManageServices from './pages/admin/ManageServices';
import ManageCounters from './pages/admin/ManageCounters';
import Analytics from './pages/admin/Analytics';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'citizen') return <Navigate to="/citizen/dashboard" replace />;
  if (user.role === 'staff') return <Navigate to="/staff/dashboard" replace />;
  return <Navigate to="/admin/dashboard" replace />;
}

export default function App() {
  return (
    <div className="min-h-screen bg-civic-25 font-body">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/citizen/dashboard"
          element={<ProtectedRoute allowedRoles={['citizen']}><CitizenDashboard /></ProtectedRoute>}
        />
        <Route
          path="/citizen/services"
          element={<ProtectedRoute allowedRoles={['citizen']}><Services /></ProtectedRoute>}
        />
        <Route
          path="/citizen/services/:id"
          element={<ProtectedRoute allowedRoles={['citizen']}><ServiceDetail /></ProtectedRoute>}
        />
        <Route
          path="/citizen/token/:id"
          element={<ProtectedRoute allowedRoles={['citizen']}><TokenPage /></ProtectedRoute>}
        />
        <Route
          path="/citizen/notifications"
          element={<ProtectedRoute allowedRoles={['citizen']}><Notifications /></ProtectedRoute>}
        />

        <Route
          path="/staff/dashboard"
          element={<ProtectedRoute allowedRoles={['staff', 'admin']}><StaffDashboard /></ProtectedRoute>}
        />

        <Route
          path="/admin/dashboard"
          element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>}
        />
        <Route
          path="/admin/services"
          element={<ProtectedRoute allowedRoles={['admin']}><ManageServices /></ProtectedRoute>}
        />
        <Route
          path="/admin/counters"
          element={<ProtectedRoute allowedRoles={['admin']}><ManageCounters /></ProtectedRoute>}
        />
        <Route
          path="/admin/analytics"
          element={<ProtectedRoute allowedRoles={['admin']}><Analytics /></ProtectedRoute>}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NotificationToast />
    </div>
  );
}
