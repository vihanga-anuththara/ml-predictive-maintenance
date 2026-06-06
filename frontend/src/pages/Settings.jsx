import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'; 
import Sidebar from '../components/Sidebar';
import './Settings.css';
import { QRCodeSVG } from 'qrcode.react';
import { 
    Search, Plus, Shield, Wrench, Edit, Trash2, UserCog, 
    Lock, Globe, Bell, Save, Database, X, CheckCircle2, AlertTriangle, QrCode
} from 'lucide-react';

function Settings() {
    const navigate = useNavigate();
    const currentRole = localStorage.getItem('userRole') || 'Technician'; 

    const [activeTab, setActiveTab] = useState(currentRole === 'Admin' ? 'users' : 'security');
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [formData, setFormData] = useState({
        id: '', displayId: '', name: '', email: '', role: 'Technician', status: 'Active', password: '', confirmPassword: ''
    });

    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, userId: null });
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [notification, setNotification] = useState(null);
    const [autoLogout, setAutoLogout] = useState(localStorage.getItem('autoLogout') !== 'false');

    // 2FA States
    const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
    const [qrUri, setQrUri] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [isVerifying2FA, setIsVerifying2FA] = useState(false);

    const showToast = (type, title, message) => {
        setNotification({ type, title, message });
        setTimeout(() => setNotification(null), 4000);
    };

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) { navigate('/'); return; }

        let inactivityTimer;
        const handleLogout = () => { localStorage.clear(); navigate('/'); };
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            if (autoLogout) inactivityTimer = setTimeout(handleLogout, 30 * 60 * 1000);
        };

        if (autoLogout) {
            window.addEventListener('mousemove', resetTimer);
            window.addEventListener('keydown', resetTimer);
            window.addEventListener('click', resetTimer);
            window.addEventListener('scroll', resetTimer);
            resetTimer(); 
        }

        return () => {
            clearTimeout(inactivityTimer);
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
            window.removeEventListener('click', resetTimer);
            window.removeEventListener('scroll', resetTimer);
        };
    }, [autoLogout, navigate]);

    const handleAutoLogoutToggle = (e) => {
        const isEnabled = e.target.checked;
        setAutoLogout(isEnabled);
        localStorage.setItem('autoLogout', isEnabled);
        showToast('success', 'Security Updated', `Auto Logout is now ${isEnabled ? 'Enabled' : 'Disabled'}.`);
    };

    useEffect(() => { if (currentRole === 'Admin') fetchUsers(); }, [currentRole]);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/system-users/');
            const formattedUsers = response.data.map(user => ({
                id: user.id, displayId: `USR-100${user.id}`, name: user.name, email: user.email, role: user.role, status: user.status
            }));
            setUsers(formattedUsers);
        } catch (error) {
            showToast('error', 'Connection Error', 'Failed to load users from the database.');
        }
    };

    const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddUser = () => {
        setModalMode('add');
        setFormData({ id: '', displayId: '', name: '', email: '', role: 'Technician', status: 'Active', password: '', confirmPassword: '' });
        setIsModalOpen(true);
    };

    const handleEditUser = (user) => {
        setModalMode('edit');
        setFormData({ ...user, password: '', confirmPassword: '' });
        setIsModalOpen(true);
    };

    const confirmDelete = (id) => setDeleteConfirm({ isOpen: true, userId: id });

    const executeDeleteUser = async () => {
        const id = deleteConfirm.userId;
        try {
            await api.delete(`/system-users/${id}/`);
            setUsers(users.filter(user => user.id !== id));
            showToast('success', 'User Deleted', 'System user has been removed successfully.');
        } catch (error) {
            showToast('error', 'Action Failed', 'Could not delete the user.');
        } finally {
            setDeleteConfirm({ isOpen: false, userId: null });
        }
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        try {
            if (modalMode === 'add') {
                if (formData.password !== formData.confirmPassword) { showToast('error', 'Validation Error', 'Passwords do not match!'); return; }
                if (formData.password.length < 6) { showToast('error', 'Validation Error', 'Password must be at least 6 characters long.'); return; }

                const nameParts = formData.name.trim().split(' ');
                const registerPayload = {
                    username: formData.email, email: formData.email, 
                    first_name: nameParts[0], last_name: nameParts.slice(1).join(' ') || 'User', 
                    password: formData.password, role: formData.role
                };
                await api.post('/register/', registerPayload);
                showToast('success', 'User Created', 'New user saved successfully!');
            } else {
                await api.put(`/system-users/${formData.id}/`, { name: formData.name, email: formData.email, role: formData.role, status: formData.status });
                showToast('success', 'User Updated', 'User details updated successfully!');
            }
            setIsModalOpen(false);
            setTimeout(() => { fetchUsers(); }, 500); 
        } catch (error) {
            showToast('error', 'Save Failed', 'Cannot connect to the server or validation failed.');
        }
    };

    const handlePasswordUpdate = async () => {
        if (!passwords.current || !passwords.new || !passwords.confirm) { showToast('error', 'Validation Error', 'Please fill all password fields.'); return; }
        if (passwords.new !== passwords.confirm) { showToast('error', 'Validation Error', 'New passwords do not match!'); return; }
        try {
            await api.post('/change-password/', { current: passwords.current, new: passwords.new });
            showToast('success', 'Security Updated', 'Password successfully updated!');
            setPasswords({ current: '', new: '', confirm: '' }); 
        } catch (error) {
            showToast('error', 'Update Failed', "Failed to update password. Check your current password.");
        }
    };

    // 2FA Setup API Call
    const handleSetup2FA = async () => {
        try {
            const response = await api.get('/setup-2fa/');
            setQrUri(response.data.qr_uri);
            setIs2FAModalOpen(true);
        } catch (error) {
            showToast('error', 'Setup Failed', 'Could not initiate 2FA setup. Please try again later.');
        }
    };

    // 2FA Verify & Enable API Call
    const handleVerify2FA = async (e) => {
        e.preventDefault();
        setIsVerifying2FA(true);
        try {
            await api.post('/verify-2fa/', { code: otpCode });
            showToast('success', '2FA Enabled', 'Two-Factor Authentication is now securely active on your account!');
            setIs2FAModalOpen(false);
            setOtpCode('');
        } catch (error) {
            showToast('error', 'Verification Failed', 'Invalid authenticator code. Please check your app and try again.');
        } finally {
            setIsVerifying2FA(false);
        }
    };

    return (
        <div className="dashboard-root">
            <Sidebar />

            <main className="main-content">
                <div className="settings-container">
                    <div className="page-header">
                        <div className="header-text">
                            <h2>System Settings</h2>
                            <p>Manage system users, roles, security, and global preferences.</p>
                        </div>
                    </div>

                    <div className="settings-tabs">
                        {currentRole === 'Admin' && <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}><UserCog size={18} /> User Management</button>}
                        <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}><Shield size={18} /> Security</button>
                        {currentRole === 'Admin' && <button className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`} onClick={() => setActiveTab('preferences')}><Wrench size={18} /> System Preferences</button>}
                    </div>

                    {/* TAB 1: USER MANAGEMENT */}
                    {activeTab === 'users' && currentRole === 'Admin' && (
                        <div className="settings-card fade-in">
                            <div className="card-header-bar">
                                <div className="search-box">
                                    <Search size={18} className="search-icon" />
                                    <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                                <button className="btn-primary" onClick={handleAddUser}><Plus size={18} /> Add New User</button>
                            </div>
                            <div className="table-container">
                                <table className="users-table">
                                    <thead><tr><th>User Details</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {filteredUsers.map((user) => (
                                            <tr key={user.id}>
                                                <td>
                                                    <div className="user-info-cell">
                                                        <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
                                                        <div><div className="user-name">{user.name}</div><div className="user-email">{user.email}</div></div>
                                                    </div>
                                                </td>
                                                <td><span className={`role-badge ${user.role.toLowerCase()}`}>{user.role === 'Admin' ? <Shield size={14} /> : <Wrench size={14} />} {user.role}</span></td>
                                                <td><span className={`status-dot ${user.status.toLowerCase()}`}></span>{user.status}</td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button className="action-btn edit" onClick={() => handleEditUser(user)} title="Edit User"><Edit size={16} /></button>
                                                        <button className="action-btn delete" onClick={() => confirmDelete(user.id)} title="Delete User"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: SECURITY */}
                    {activeTab === 'security' && (
                        <div className="settings-content-grid fade-in">
                            <div className="settings-card p-6">
                                <h3 className="section-title"><Lock size={20} /> Change Password</h3>
                                <form className="settings-form mt-4">
                                    <div className="form-group"><label>Current Password</label><input type="password" value={passwords.current} onChange={(e) => setPasswords({...passwords, current: e.target.value})} /></div>
                                    <div className="form-group"><label>New Password</label><input type="password" value={passwords.new} onChange={(e) => setPasswords({...passwords, new: e.target.value})} /></div>
                                    <div className="form-group"><label>Confirm New Password</label><input type="password" value={passwords.confirm} onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} /></div>
                                    <button type="button" className="btn-primary mt-2" onClick={handlePasswordUpdate}>Update Password</button>
                                </form>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* 2FA Security Section */}
                                <div className="settings-card p-6" style={{ borderLeft: '4px solid #8b5cf6' }}>
                                    <h3 className="section-title"><QrCode size={20} color="#8b5cf6" /> Two-Factor Authentication (2FA)</h3>
                                    <p className="section-desc mt-2">Add an extra layer of security to your account using an authenticator app (e.g., Google Authenticator, Authy).</p>
                                    <button type="button" className="btn-primary mt-4" style={{ backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }} onClick={handleSetup2FA}>
                                        <Shield size={18} /> Setup 2FA
                                    </button>
                                </div>

                                <div className="settings-card p-6">
                                    <h3 className="section-title"><Shield size={20} /> Session Management</h3>
                                    <p className="section-desc">Protect your account from unauthorized access when away from your device.</p>
                                    <div className="toggle-section mt-4">
                                        <div>
                                            <h4 className="font-medium">Auto Logout</h4>
                                            <p className="text-muted text-sm">Automatically log out inactive users after 30 minutes.</p>
                                        </div>
                                        <label className="toggle-switch"><input type="checkbox" checked={autoLogout} onChange={handleAutoLogoutToggle} /><span className="slider round"></span></label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: SYSTEM PREFERENCES */}
                    {activeTab === 'preferences' && currentRole === 'Admin' && (
                        <div className="settings-content-grid fade-in">
                            <div className="settings-card p-6">
                                <h3 className="section-title"><Globe size={20} /> Regional Settings</h3>
                                <form className="settings-form mt-4">
                                    <div className="form-group"><label>Timezone</label><select><option>Asia/Colombo (GMT+5:30)</option><option>UTC (GMT+0:00)</option><option>America/New_York (GMT-5:00)</option></select></div>
                                    <div className="form-group"><label>Date Format</label><select><option>YYYY-MM-DD</option><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select></div>
                                </form>
                                <hr className="divider" />
                                <h3 className="section-title mt-4"><Database size={20} /> Data Management</h3>
                                <div className="toggle-section mt-4">
                                    <div><h4 className="font-medium">Daily Cloud Backups</h4><p className="text-muted text-sm">Automatically backup system logs and ML data to the cloud.</p></div>
                                    <label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="slider round"></span></label>
                                </div>
                            </div>

                            <div className="settings-card p-6">
                                <h3 className="section-title"><Bell size={20} /> Notification Preferences</h3>
                                <p className="section-desc">Choose how you want to be notified about system alerts and ML predictions.</p>
                                <div className="notification-options mt-4">
                                    <div className="toggle-section">
                                        <div><h4 className="font-medium">Email Alerts</h4><p className="text-muted text-sm">Receive critical ML predictions via email.</p></div>
                                        <label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="slider round"></span></label>
                                    </div>
                                    <div className="toggle-section mt-4">
                                        <div><h4 className="font-medium">Weekly Reports</h4><p className="text-muted text-sm">Send automated summary reports every Monday.</p></div>
                                        <label className="toggle-switch"><input type="checkbox" defaultChecked /><span className="slider round"></span></label>
                                    </div>
                                </div>
                                <button type="button" className="btn-primary w-full mt-6 flex-center" onClick={() => showToast('success', 'Preferences Saved', 'System preferences updated successfully!')}><Save size={18} /> Save Preferences</button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* User Edit/Add Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{modalMode === 'add' ? 'Add System User' : 'Edit User Profile'}</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveUser}>
                            <div className="modal-body">
                                <div className="form-group"><label>Full Name</label><input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                                <div className="form-group"><label>Email Address</label><input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} /></div>
                                {modalMode === 'add' && (
                                    <div className="form-row">
                                        <div className="form-group"><label>Password</label><input type="password" required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} /></div>
                                        <div className="form-group"><label>Confirm Password</label><input type="password" required value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} /></div>
                                    </div>
                                )}
                                <div className="form-row">
                                    <div className="form-group"><label>System Role</label><select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}><option>Technician</option><option>Admin</option></select></div>
                                    <div className="form-group"><label>Account Status</label><select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}><option>Active</option><option>Inactive</option></select></div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Save User</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteConfirm.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><div style={{ background: '#fef2f2', padding: '16px', borderRadius: '50%' }}><AlertTriangle size={36} color="#ef4444" /></div></div>
                        <h3 style={{ marginBottom: '12px', color: '#111827', fontSize: '1.25rem' }}>Remove User?</h3>
                        <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '0.95rem' }}>Are you sure you want to remove this user from the system? This action cannot be undone.</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button className="btn-cancel" style={{ flex: 1 }} onClick={() => setDeleteConfirm({ isOpen: false, userId: null })}>Cancel</button>
                            <button className="btn-primary" style={{ flex: 1, backgroundColor: '#ef4444', borderColor: '#ef4444' }} onClick={executeDeleteUser}>Yes, Remove</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2FA Setup Modal */}
            {is2FAModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center' }}>
                        <div className="modal-header">
                            <h3>Set Up Authenticator</h3>
                            <button className="close-btn" onClick={() => setIs2FAModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <p style={{ marginBottom: '16px', color: '#4b5563', fontSize: '0.95rem' }}>
                                1. Scan this QR code using <strong>Google Authenticator</strong> or any 2FA app on your phone.
                            </p>
                            
                            <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px', display: 'flex', justifyContent: 'center', width: '100%' }}>
                                {qrUri ? (
                                    <QRCodeSVG value={qrUri} size={180} level="M" />
                                ) : (
                                    <div style={{ height: '180px', display: 'flex', alignItems: 'center', color: '#9ca3af' }}>Loading QR Code...</div>
                                )}
                            </div>

                            <p style={{ marginBottom: '12px', color: '#4b5563', fontSize: '0.95rem' }}>
                                2. Enter the 6-digit code generated by your app to verify.
                            </p>
                            
                            <form onSubmit={handleVerify2FA} style={{ width: '100%' }}>
                                <input 
                                    type="text"
                                    className="settings-otp-input"
                                    placeholder="000 000"
                                    maxLength="6"
                                    required
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                />
                                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                    <button type="button" className="btn-cancel" style={{ flex: 1 }} onClick={() => setIs2FAModalOpen(false)}>Cancel</button>
                                    <button type="submit" className="btn-primary" style={{ flex: 1, backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }} disabled={isVerifying2FA || otpCode.length < 6}>
                                        {isVerifying2FA ? 'Verifying...' : 'Verify & Enable'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            {notification && (
                <div className="toast-container">
                    <div className={`toast-message ${notification.type}`}>
                        <div className="toast-icon">{notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}</div>
                        <div className="toast-content"><div className="toast-title">{notification.title}</div><div className="toast-desc">{notification.message}</div></div>
                        <button className="toast-close" onClick={() => setNotification(null)}><X size={16} /></button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Settings;