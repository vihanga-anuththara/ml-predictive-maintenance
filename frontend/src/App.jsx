/*
 * Copyright 2026 Vihanga Anuththara
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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