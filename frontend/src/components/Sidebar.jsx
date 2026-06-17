import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';
import {
    LayoutDashboard, Building2, MonitorSmartphone,
    AlertTriangle, Wrench, FileText,
    Users, FileSignature, Settings, LogOut, Trash2
} from 'lucide-react';

function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    // Get the current user role to conditionally render admin-only links
    const currentRole = localStorage.getItem('userRole') || 'Technician';

    // Logout Function: Clears all authentication data and redirects to login
    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    // Helper to highlight the active tab
    const isActive = (path) => {
        return location.pathname === path ? 'active' : '';
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="brand-logo">PF</div>
                <div className="brand-name">Predict<span>Failures</span></div>
            </div>

            <div className="sidebar-menu">
                <span className="menu-label">Overview</span>
                <button
                    className={`menu-item ${isActive('/dashboard')}`}
                    onClick={() => navigate('/dashboard')}
                >
                    <LayoutDashboard size={20} /> Dashboard
                </button>
                <button
                    className={`menu-item ${isActive('/companies')}`}
                    onClick={() => navigate('/companies')}
                >
                    <Building2 size={20} /> Companies
                </button>
                <button
                    className={`menu-item ${isActive('/devices')}`}
                    onClick={() => navigate('/devices')}
                >
                    <MonitorSmartphone size={20} /> Devices
                </button>

                <span className="menu-label">Risk & Maintenance</span>
                <button
                    className={`menu-item ${isActive('/riskMonitor')}`}
                    onClick={() => navigate('/riskMonitor')}
                >
                    <AlertTriangle size={20} /> Risk Monitor
                </button>
                <button
                    className={`menu-item ${isActive('/maintenanceLogs')}`}
                    onClick={() => navigate('/maintenanceLogs')}
                >
                    <Wrench size={20} /> Maintenance Logs
                </button>
                <button
                    className={`menu-item ${isActive('/reports')}`}
                    onClick={() => navigate('/reports')}
                >
                    <FileText size={20} /> Reports
                </button>

                <span className="menu-label">Administration</span>
                <button
                    className={`menu-item ${isActive('/technicians')}`}
                    onClick={() => navigate('/technicians')}
                >
                    <Users size={20} /> Task Assignments
                </button>

                {/* Contracts - Visible only to Admins */}
                {currentRole === 'Admin' && (
                    <button
                        className={`menu-item ${isActive('/contracts')}`}
                        onClick={() => navigate('/contracts')}
                    >
                        <FileSignature size={20} /> Contracts
                    </button>
                )}

                <button
                    className={`menu-item ${isActive('/settings')}`}
                    onClick={() => navigate('/settings')}
                >
                    <Settings size={20} /> Settings
                </button>

                {/* Trash/Recycle Bin - Visible only to Admins */}
                {currentRole === 'Admin' && (
                    <button
                        className={`menu-item ${isActive('/trash')}`}
                        onClick={() => navigate('/trash')}
                    >
                        <Trash2 size={20} /> Recycle Bin
                    </button>
                )}
            </div>

            <div className="sidebar-footer">
                <button className="logout-btn" onClick={handleLogout}>
                    <LogOut size={20} /> Sign Out
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;