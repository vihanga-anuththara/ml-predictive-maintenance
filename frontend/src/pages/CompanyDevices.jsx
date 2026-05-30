import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import './CompanyDevices.css';
import { Search, Plus, Edit, Trash2, X, Monitor, Laptop, MonitorSmartphone, CheckCircle2, AlertTriangle, CalendarDays, Activity } from 'lucide-react';

function Devices() {
    const navigate = useNavigate();
    const [devices, setDevices] = useState([]);
    const [companies, setCompanies] = useState([]); 
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, deviceId: null });

    const [formData, setFormData] = useState({
        id: '', name: '', type: 'Desktop', company: '', serialNumber: '', status: 'Healthy', installedDate: ''
    });

    const [notification, setNotification] = useState(null);

    const showToast = (type, title, message) => {
        setNotification({ type, title, message });
        setTimeout(() => setNotification(null), 4000);
    };

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) { navigate('/'); return; }
        fetchInitialData();
    }, [navigate]);

    const fetchInitialData = async () => {
        try {
            setIsLoading(true);
            const [devicesRes, companiesRes] = await Promise.all([api.get('/devices/'), api.get('/companies/')]);
            setCompanies(companiesRes.data);
            setDevices(devicesRes.data.map(dev => ({
                id: dev.id, name: dev.name, type: dev.device_type, company: dev.company,
                serialNumber: dev.serial_number || '', status: dev.status || 'Healthy', installedDate: dev.installed_date || 'N/A' 
            })));
        } catch (error) {
            showToast('error', 'Connection Error', 'Failed to load devices or companies.');
        } finally {
            setIsLoading(false);
        }
    };

    const getCompanyName = (companyIdentifier) => {
        if (!companyIdentifier) return 'Unknown Company';
        const comp = companies.find(c => c.id == companyIdentifier || c.name.toLowerCase() === companyIdentifier.toString().toLowerCase());
        return comp ? comp.name : companyIdentifier;
    };

    const filteredDevices = devices.filter(device => {
        const compName = getCompanyName(device.company).toLowerCase();
        const search = searchTerm.toLowerCase();
        return device.name.toLowerCase().includes(search) || compName.includes(search) || (device.serialNumber && device.serialNumber.toLowerCase().includes(search));
    });

    const getDeviceIcon = (type) => {
        switch(type) {
            case 'Desktop': return <Monitor size={18} className="device-icon blue" />;
            case 'Laptop': return <Laptop size={18} className="device-icon purple" />;
            default: return <MonitorSmartphone size={18} className="device-icon gray" />;
        }
    };

    const handleAdd = () => { setModalMode('add'); setFormData({ id: '', name: '', type: 'Desktop', company: '', serialNumber: '', status: 'Healthy', installedDate: '' }); setIsModalOpen(true); };
    const handleEdit = (device) => { setModalMode('edit'); setFormData({ ...device, company: getCompanyName(device.company) }); setIsModalOpen(true); };

    const confirmDelete = (id) => setDeleteConfirm({ isOpen: true, deviceId: id });
    const executeDelete = async () => {
        const id = deleteConfirm.deviceId;
        try {
            await api.delete(`/devices/${id}/`);
            setDevices(devices.filter(device => device.id !== id));
            showToast('success', 'Device Deleted', 'Device removed successfully.');
        } catch (error) {
            showToast('error', 'Action Failed', 'Could not delete the device.');
        } finally {
            setDeleteConfirm({ isOpen: false, deviceId: null });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const selectedCompany = companies.find(c => c.name === formData.company);
        if (!selectedCompany) { showToast('error', 'Validation Error', 'Select valid Company.'); return; }
        
        const payload = { name: formData.name, company: selectedCompany.name, device_type: formData.type, serial_number: formData.serialNumber, status: formData.status, installed_date: formData.installedDate };
        try {
            if (modalMode === 'add') { await api.post('/devices/', payload); showToast('success', 'Device Registered', 'New device added!'); } 
            else { await api.put(`/devices/${formData.id}/`, payload); showToast('success', 'Device Updated', 'Device details updated!'); }
            setIsModalOpen(false); fetchInitialData(); 
        } catch (error) { showToast('error', 'Save Failed', 'Error saving device.'); }
    };

    return (
        <div className="dashboard-root">
            <Sidebar />
            <main className="main-content">
                <div className="devices-container">
                    <div className="page-header">
                        <div className="header-text"><h2>Hardware Inventory</h2>
                        <p>Register and manage all computers and laptops.</p></div>
                        <button className="btn-primary" onClick={handleAdd}><Plus size={18} /> Register Device</button>
                    </div>
                    <div className="controls-bar">
                        <div className="search-box"><Search size={18} /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                    </div>
                    <div className="table-card">
                        <table className="data-table">
                            <thead><tr><th>Device Details</th><th>Company</th><th>Serial</th><th>Installed</th><th>Status</th><th>Actions</th></tr></thead>
                            <tbody>
                                {filteredDevices.map((device) => (
                                    <tr key={device.id}>
                                        <td><div className="device-info-cell"><div className="icon-wrapper">{getDeviceIcon(device.type)}</div><div><div className="device-name">{device.name}</div><div className="device-id">{device.type}</div></div></div></td>
                                        <td>{getCompanyName(device.company)}</td><td>{device.serialNumber || 'N/A'}</td>
                                        <td><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={14} /><span>{device.installedDate}</span></div></td>
                                        <td><span className={`status-badge ${device.status.toLowerCase()}`}>{device.status}</span></td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="action-btn log" onClick={() => navigate('/maintenancelogs', { state: { autoSelectSerial: device.serialNumber } })}><Activity size={16} /></button>
                                                <button className="action-btn edit" onClick={() => handleEdit(device)}><Edit size={16} /></button>
                                                <button className="action-btn delete" onClick={() => confirmDelete(device.id)}><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header"><h3>{modalMode === 'add' ? 'Register Device' : 'Edit Device'}</h3><button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button></div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="form-group"><label>Device Name</label><input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} /></div>
                                <div className="form-row">
                                    <div className="form-group"><label>Type</label><select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}><option>Desktop</option><option>Laptop</option></select></div>
                                    <div className="form-group"><label>Serial Number</label><input type="text" required value={formData.serialNumber} onChange={(e) => setFormData({...formData, serialNumber: e.target.value})} /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label>Company</label><input list="company-list" required value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} /><datalist id="company-list">{companies.map(comp => (<option key={comp.id} value={comp.name} />))}</datalist></div>
                                    <div className="form-group"><label>Installed Date</label><input type="date" required value={formData.installedDate} onChange={(e) => setFormData({...formData, installedDate: e.target.value})} /></div>
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
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><div style={{ background: '#fef2f2', padding: '16px', borderRadius: '50%' }}><AlertTriangle size={36} color="#ef4444" /></div></div>
                        <h3 style={{ marginBottom: '12px' }}>Delete Device?</h3>
                        <p style={{ color: '#6b7280', marginBottom: '24px' }}>Are you sure you want to remove this device? This action cannot be undone.</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button className="btn-cancel" style={{ flex: 1 }} onClick={() => setDeleteConfirm({ isOpen: false, deviceId: null })}>Cancel</button>
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
export default Devices;