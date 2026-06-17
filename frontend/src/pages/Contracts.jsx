import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import './Contracts.css';
import { Search, Plus, Edit, Trash2, FileSignature, X, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

function Contracts() {
    const navigate = useNavigate();
    const currentRole = localStorage.getItem('userRole') || 'Technician';

    const [contracts, setContracts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');

    const [formData, setFormData] = useState({
        id: '', displayId: '', company: '', email: '', startDate: '', endDate: '', value: ''
    });

    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, contractId: null });
    const [notification, setNotification] = useState(null);

    const showToast = (type, title, message) => {
        setNotification({ type, title, message });
        setTimeout(() => setNotification(null), 4000);
    };

    // Calculation Status
    const calculateStatus = (endDateString) => {
        if (!endDateString) return 'Unknown';

        // Today (00:00:00)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // End date (00:00:00)
        const endDate = new Date(endDateString);
        endDate.setHours(0, 0, 0, 0);

        // Calculate days
        const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Expired';       // Days<0  Expired
        if (diffDays === 0) return 'Expires Today'; // Expires today
        if (diffDays <= 30) return 'Expiring Soon'; // Days <30 Expiring soon
        return 'Active';
    };

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) { navigate('/'); return; }
        if (currentRole === 'Admin') fetchContracts();
    }, [currentRole, navigate]);

    const fetchContracts = async () => {
        try {
            const response = await api.get('/contracts/');
            setContracts(response.data.map(cont => ({
                id: cont.id, displayId: `CONT-100${cont.id}`, company: cont.company,
                email: cont.contact_email || '', startDate: cont.start_date, endDate: cont.end_date,
                value: cont.value, status: calculateStatus(cont.end_date)
            })));
        } catch (error) {
            showToast('error', 'Connection Error', 'Failed to load contracts.');
        }
    };

    const filteredContracts = contracts.filter(c => c.company.toLowerCase().includes(searchTerm.toLowerCase()) || c.displayId.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleAddClick = () => { setModalMode('add'); setFormData({ id: '', displayId: '', company: '', email: '', startDate: '', endDate: '', value: '' }); setIsModalOpen(true); };
    const handleEditClick = (contract) => { setModalMode('edit'); setFormData(contract); setIsModalOpen(true); };

    const confirmDelete = (id) => setDeleteConfirm({ isOpen: true, contractId: id });
    const executeDelete = async () => {
        const id = deleteConfirm.contractId;
        try {
            await api.delete(`/contracts/${id}/`);
            setContracts(contracts.filter(contract => contract.id !== id));
            showToast('success', 'Contract Deleted', 'The contract has been removed successfully.');
        } catch (error) {
            showToast('error', 'Action Failed', 'Could not delete the contract.');
        } finally {
            setDeleteConfirm({ isOpen: false, contractId: null });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const payload = { company: formData.company, contact_email: formData.email, start_date: formData.startDate, end_date: formData.endDate, value: formData.value, status: calculateStatus(formData.endDate) };
        try {
            if (modalMode === 'add') {
                await api.post('/contracts/', payload); showToast('success', 'Contract Created', 'New service contract added!');
            } else {
                await api.put(`/contracts/${formData.id}/`, payload); showToast('success', 'Contract Updated', 'Contract details updated!');
            }
            setIsModalOpen(false); fetchContracts();
        } catch (error) { showToast('error', 'Save Failed', 'An error occurred while saving.'); }
    };

    return (
        <div className="dashboard-root">
            <Sidebar />
            <main className="main-content">
                <div className="contracts-container">
                    <div className="page-header">
                        <div className="header-text">
                            <h2>Service Contracts</h2>
                            <p>Manage client agreements, billing cycles, and renewals.</p>
                        </div>
                        {currentRole === 'Admin' && (
                            <button className="btn-primary" onClick={handleAddClick}><Plus size={18} /> Add Contract</button>
                        )}
                    </div>

                    {currentRole !== 'Admin' ? (
                        <div className="restricted-view" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', marginTop: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <ShieldAlert size={64} color="#ef4444" />
                            <h2 style={{ marginTop: '16px', color: '#111827', fontSize: '1.5rem' }}>Access Restricted</h2>
                            <p style={{ color: '#6b7280', maxWidth: '400px', margin: '8px auto 0', lineHeight: '1.6' }}>
                                You do not have the required permissions to view or manage Service Contracts. Please contact a System Administrator.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="controls-bar">
                                <div className="search-box"><Search size={18} /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                            </div>
                            <div className="table-card">
                                <table className="data-table">
                                    <thead><tr><th>ID</th><th>Company</th><th>Duration</th><th>Value</th><th>Status</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {filteredContracts.map((contract) => (
                                            <tr key={contract.id}>
                                                <td>{contract.displayId}</td><td>{contract.company}</td><td>{contract.startDate} to {contract.endDate}</td>
                                                <td>{contract.value}</td>
                                                <td>
                                                    <span className={`status-badge ${contract.status.toLowerCase().replace(' ', '-')}`}>
                                                        {contract.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button className="action-btn edit" onClick={() => handleEditClick(contract)}><Edit size={16} /></button>
                                                        <button className="action-btn delete" onClick={() => confirmDelete(contract.id)}><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Modals and Notifications */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header"><h3>{modalMode === 'add' ? 'Add Contract' : 'Edit Contract'}</h3><button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button></div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="form-group"><label>Company Name</label><input type="text" required value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} /></div>
                                <div className="form-group"><label>Email</label><input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                                <div className="form-row">
                                    <div className="form-group"><label>Start Date</label><input type="date" required value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} /></div>
                                    <div className="form-group"><label>End Date</label><input type="date" required value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Contract Value</label>
                                        <input type="text" placeholder="e.g. LKR 10,000" required value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button><button type="submit" className="btn-primary">Save</button></div>
                        </form>
                    </div>
                </div>
            )}

            {deleteConfirm.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', margin: '0 auto 16px' }}><div style={{ background: '#fef2f2', padding: '16px', borderRadius: '50%' }}><AlertTriangle size={36} color="#ef4444" /></div></div>
                        <h3 style={{ marginBottom: '12px' }}>Delete Contract?</h3>
                        <p style={{ color: '#6b7280', marginBottom: '24px' }}>Are you sure you want to delete this contract? This action cannot be undone.</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button className="btn-cancel" style={{ flex: 1 }} onClick={() => setDeleteConfirm({ isOpen: false, contractId: null })}>Cancel</button>
                            <button className="btn-primary" style={{ flex: 1, backgroundColor: '#ef4444', borderColor: '#ef4444' }} onClick={executeDelete}>Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}

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

export default Contracts;