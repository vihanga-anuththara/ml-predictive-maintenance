import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import CompanyDevices from './pages/CompanyDevices';
import Contracts from './pages/Contracts';
import MaintenanceLogs from './pages/MaintenanceLogs';
import RiskMonitor from './pages/RiskMonitor';
import Reports from './pages/Reports';
import Technicians from './pages/Technicians';
import Settings from './pages/Settings';
import Trash from './pages/Trash';
import ProtectedRoute from './utils/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />

        {/* Devices Routes */}
        <Route path="/devices" element={<ProtectedRoute><CompanyDevices /></ProtectedRoute>} />

        {/* Specific company devices Routes */}
        <Route path="/companies/:id/devices" element={<ProtectedRoute><CompanyDevices /></ProtectedRoute>} />

        <Route path="/maintenancelogs" element={<ProtectedRoute><MaintenanceLogs /></ProtectedRoute>} />
        <Route path="/riskmonitor" element={<ProtectedRoute><RiskMonitor /></ProtectedRoute>} />
        <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
        <Route path="/technicians" element={<ProtectedRoute><Technicians /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/trash" element={<ProtectedRoute><Trash /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;