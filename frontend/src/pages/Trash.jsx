import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import './Trash.css';
import { RefreshCcw, Trash2, AlertTriangle, X, CheckCircle2 } from 'lucide-react';

function Trash() {
    const navigate = useNavigate();
    const currentRole = localStorage.getItem('userRole') || 'Technician';

    const [trashData, setTrashData] = useState({ companies: [], contracts: [], devices: [], tasks: [] });
    const [activeTab, setActiveTab] = useState('companies');
    const [notification, setNotification] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, item: null, action: '' });

    const showToast = (type, title, message) => {
        setNotification({ type, title, message });
        setTimeout(() => setNotification(null), 4000);
    };

    useEffect(() => {
        if (currentRole !== 'Admin') {
            navigate('/dashboard');
            return;
        }
        fetchTrashData();
    }, [currentRole, navigate]);

    const fetchTrashData = async () => {
        try {
            const res = await api.get('/trash/');
            setTrashData(res.data);
        } catch (error) {
            showToast('error', 'Error', 'Failed to load trash items.');
        }
    };

    const handleActionClick = (item, type, action) => {
        setConfirmModal({ isOpen: true, item: { ...item, type }, action });
    };

    const executeAction = async () => {
        const { item, action } = confirmModal;
        try {
            await api.post('/trash/', {
                action: action === 'restore' ? 'restore' : 'permanent_delete',
                type: item.type,
                id: item.id
            });

            showToast('success', 'Success', `Item ${action === 'restore' ? 'restored' : 'permanently deleted'} successfully.`);
            fetchTrashData();
        } catch (error) {
            showToast('error', 'Action Failed', 'Could not complete the action.');
        } finally {
            setConfirmModal({ isOpen: false, item: null, action: '' });
        }
    };

    const renderTable = (items, type, columns) => {
        if (items.length === 0) return <div className="trash-empty-state">No deleted items found in this category.</div>;

        return (
            <div className="trash-table-card">
                <table className="trash-table">
                    <thead>
                        <tr>
                            {columns.map(col => <th key={col}>{col}</th>)}
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.id}>
                                <td>{item.id}</td>
                                <td>{item.name || item.company__name || item.device__name}</td>
                                {item.issue && <td>{item.issue}</td>}
                                <td className="deleted-date">{new Date(item.deleted_at).toLocaleDateString()}</td>
                                <td className="action-buttons">
                                    <button className="btn-restore" onClick={() => handleActionClick(item, type, 'restore')}>
                                        <RefreshCcw size={14} /> Restore
                                    </button>
                                    <button className="btn-perm-delete" onClick={() => handleActionClick(item, type, 'delete')}>
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="dashboard-root">
            <Sidebar />
            <main className="main-content">
                <div className="trash-container fade-in">

                    <div className="page-header">
                        <div className="header-text">
                            <h2 className="trash-title"><Trash2 color="#ef4444" /> Recycle Bin</h2>
                            <p>Restore deleted items or permanently remove them. Items are auto-deleted after 30 days.</p>
                        </div>
                    </div>

                    <div className="trash-tabs">
                        {['companies', 'contracts', 'devices', 'tasks'].map(tab => (
                            <button
                                key={tab}
                                className={`trash-tab-btn ${activeTab === tab ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab} <span className="tab-count">({trashData[tab] ? trashData[tab].length : 0})</span>
                            </button>
                        ))}
                    </div>

                    <div className="trash-content">
                        {activeTab === 'companies' && renderTable(trashData.companies, 'company', ['ID', 'Company Name', 'Deleted Date'])}
                        {activeTab === 'contracts' && renderTable(trashData.contracts, 'contract', ['ID', 'Company Name', 'Deleted Date'])}
                        {activeTab === 'devices' && renderTable(trashData.devices, 'device', ['ID', 'Device Name', 'Deleted Date'])}
                        {activeTab === 'tasks' && renderTable(trashData.tasks, 'task', ['ID', 'Device Name', 'Issue', 'Deleted Date'])}
                    </div>

                </div>
            </main>

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-content trash-modal">
                        <div className="modal-icon-wrapper">
                            <div className={`modal-icon ${confirmModal.action === 'restore' ? 'restore' : 'delete'}`}>
                                {confirmModal.action === 'restore' ? <RefreshCcw size={36} /> : <AlertTriangle size={36} />}
                            </div>
                        </div>
                        <h3>{confirmModal.action === 'restore' ? 'Restore Item?' : 'Permanently Delete?'}</h3>
                        <p>
                            {confirmModal.action === 'restore'
                                ? 'This item will be restored and visible in the main system again.'
                                : 'Are you sure? This action cannot be undone and data will be lost forever.'}
                        </p>
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setConfirmModal({ isOpen: false, item: null, action: '' })}>Cancel</button>
                            <button className={`btn-primary ${confirmModal.action === 'delete' ? 'danger' : 'success'}`} onClick={executeAction}>
                                Yes, {confirmModal.action === 'restore' ? 'Restore' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            {notification && (
                <div className="toast-container">
                    <div className={`toast-message ${notification.type}`}>
                        <div className="toast-icon">
                            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                        </div>
                        <div className="toast-content">
                            <div className="toast-title">{notification.title}</div>
                            <div className="toast-desc">{notification.message}</div>
                        </div>
                        <button className="toast-close" onClick={() => setNotification(null)}><X size={16} /></button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Trash;