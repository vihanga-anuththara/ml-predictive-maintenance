import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'; 
import Sidebar from '../components/Sidebar';
import './Dashboard.css';
import { 
    Search, User, Building2, MonitorSmartphone, 
    ClipboardList, FileSignature, Clock, CheckCircle2, AlertTriangle, XCircle 
} from 'lucide-react';

function Dashboard() {
    const navigate = useNavigate(); 

    const [stats, setStats] = useState({
        companies: 0,
        devices: 0,
        pendingTasks: 0,
        expiringContracts: 0
    });
    
    const [allTasks, setAllTasks] = useState([]); 
    const [recentTasks, setRecentTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [loggedInUser, setLoggedInUser] = useState('Loading...');
    const [userRole, setUserRole] = useState('Administrator');

    const [systemHealth, setSystemHealth] = useState({
        api: 'Checking...',
        database: 'Checking...'
    });

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            navigate('/'); 
            return;
        }

        const storedName = localStorage.getItem('username');
        const storedRole = localStorage.getItem('userRole');
        setLoggedInUser(storedName || 'System Admin');
        setUserRole(storedRole || 'Administrator');

        fetchDashboardData();
    }, [navigate]);

    const fetchDashboardData = async () => {
        try {
            const [compRes, devRes, taskRes, contRes] = await Promise.all([
                api.get('/companies/'),
                api.get('/devices/'),
                api.get('/tasks/'),
                api.get('/contracts/')
            ]);

            setSystemHealth({ api: 'Online', database: 'Online' });

            const activeTasks = taskRes.data.filter(t => t.status !== 'Completed');
            const reversedTasks = [...taskRes.data].reverse();
            
            setAllTasks(reversedTasks);
            setRecentTasks(reversedTasks.slice(0, 5)); 

            const today = new Date();
            const expiring = contRes.data.filter(c => {
                const endDate = new Date(c.end_date);
                const diffDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays <= 30;
            });

            setStats({
                companies: compRes.data.length,
                devices: devRes.data.length,
                pendingTasks: activeTasks.length,
                expiringContracts: expiring.length
            });

        } catch (error) {
            console.error("Dashboard data fetch error:", error);
            setSystemHealth({ api: 'Offline', database: 'Unreachable' });

            if (error.response && error.response.status === 401) {
                localStorage.clear();
                navigate('/');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Search Option
    const displayedTasks = searchQuery 
        ? allTasks.filter(task => 
            (task.device && String(task.device).toLowerCase().includes(searchQuery.toLowerCase())) ||
            (task.brought_by && String(task.brought_by).toLowerCase().includes(searchQuery.toLowerCase())) ||
            (`TSK-100${task.id}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
            (task.status && String(task.status).toLowerCase().includes(searchQuery.toLowerCase()))
        )
        : recentTasks;

    return (
        <div className="dashboard-root">
            <Sidebar />

            <main className="main-content">
                <header className="top-nav">
                    <div className="search-bar">
                        <Search size={18} className="search-icon" />
                        <input 
                            type="text" 
                            placeholder="Search tasks by ID, device, client or status..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="nav-actions">
                        <div className="user-profile">
                            <div className="avatar"><User size={18} /></div>
                            <div className="user-info">
                                <span className="user-name">{loggedInUser}</span>
                                <span className="user-role">{userRole}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="dashboard-container">
                    <div className="dashboard-header">
                        <h2>System Center</h2>
                        <p>Welcome back, <span style={{fontWeight: 'bold', color: '#2563eb'}}>{loggedInUser}</span>. Here's the current status of your IT infrastructure.</p>
                    </div>

                    {isLoading ? (
                        <div className="loading-state">Loading dashboard data...</div>
                    ) : (
                        <>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-header"><span className="stat-title">Client Companies</span><Building2 size={20} color="#3b82f6" /></div>
                                    <span className="stat-value">{stats.companies}</span><span className="stat-desc">Total registered clients</span>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-header"><span className="stat-title">Hardware Assets</span><MonitorSmartphone size={20} color="#8b5cf6" /></div>
                                    <span className="stat-value">{stats.devices}</span><span className="stat-desc">Monitored endpoints</span>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-header"><span className="stat-title">Active Tasks</span><ClipboardList size={20} color="#f59e0b" /></div>
                                    <span className="stat-value">{stats.pendingTasks}</span><span className="stat-desc">Pending maintenance</span>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-header"><span className="stat-title">Contract Alerts</span><FileSignature size={20} color={stats.expiringContracts > 0 ? "#ef4444" : "#10b981"} /></div>
                                    <span className="stat-value">{stats.expiringContracts}</span><span className="stat-desc">Expiring within 30 days</span>
                                </div>
                            </div>

                            <div className="content-grid">
                                <div className="dashboard-panel">
                                    <div className="panel-header">
                                        <h3>{searchQuery ? 'Search Results' : 'Recent Maintenance Tasks'}</h3>
                                    </div>
                                    <div className="panel-body no-padding">
                                        <table className="dash-table">
                                            <thead>
                                                <tr><th>Task ID</th><th>Device</th><th>Client</th><th>Status</th></tr>
                                            </thead>
                                            <tbody>
                                                {displayedTasks.length > 0 ? displayedTasks.map(task => (
                                                    <tr key={task.id}>
                                                        <td className="task-id">TSK-100{task.id}</td>
                                                        <td className="font-medium">{task.device ? `Device #${task.device}` : 'Unknown Device'}</td>
                                                        <td className="text-muted">{task.brought_by || 'Unknown'}</td>
                                                        <td><span className={`badge-status ${task.status.toLowerCase().replace(' ', '-')}`}>{task.status}</span></td>
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>{searchQuery ? 'No tasks matched your search.' : 'No tasks found.'}</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="dashboard-panel">
                                    <div className="panel-header">
                                        <h3>Quick System Status</h3>
                                    </div>
                                    <div className="panel-body">
                                        <div className="status-item">
                                            <div className={`status-icon ${systemHealth.api === 'Online' ? 'success' : 'error'}`} style={{ color: systemHealth.api === 'Online' ? '#10b981' : '#ef4444' }}>
                                                {systemHealth.api === 'Online' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                            </div>
                                            <div className="status-text">
                                                <h4>API Connection</h4>
                                                <p>{systemHealth.api === 'Online' ? 'Backend server is running optimally' : 'Cannot reach backend server'}</p>
                                            </div>
                                        </div>

                                        <div className="status-item">
                                            <div className={`status-icon ${systemHealth.database === 'Online' ? 'success' : 'error'}`} style={{ color: systemHealth.database === 'Online' ? '#10b981' : '#ef4444' }}>
                                                {systemHealth.database === 'Online' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                            </div>
                                            <div className="status-text">
                                                <h4>Database Health</h4>
                                                <p>{systemHealth.database === 'Online' ? 'All records are syncing perfectly' : 'Database connection failed'}</p>
                                            </div>
                                        </div>

                                        {stats.expiringContracts > 0 && (
                                            <div className="status-item">
                                                <div className="status-icon warning" style={{ color: '#f59e0b' }}><AlertTriangle size={18} /></div>
                                                <div className="status-text">
                                                    <h4>Contract Renewals</h4>
                                                    <p>{stats.expiringContracts} contracts need your attention soon.</p>
                                                </div>
                                            </div>
                                        )}
                                        {stats.pendingTasks > 0 && (
                                            <div className="status-item">
                                                <div className="status-icon blue" style={{ color: '#3b82f6' }}><Clock size={18} /></div>
                                                <div className="status-text">
                                                    <h4>Pending Work</h4>
                                                    <p>Technicians have {stats.pendingTasks} tasks in progress.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

export default Dashboard;