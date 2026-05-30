import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Sidebar from '../components/Sidebar'; 
import './Companies.css';
import { 
    Building2, Search, ShieldCheck, ShieldAlert, MonitorSmartphone, 
    ArrowLeft, FileSignature, Laptop, Monitor, Trash2, X, CheckCircle2, AlertTriangle 
} from 'lucide-react'; 

function Companies() {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]); 
    const [isLoading, setIsLoading] = useState(true); 
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRisk, setFilterRisk] = useState('all');

    const [selectedCompany, setSelectedCompany] = useState(null);
    const [companyDevices, setCompanyDevices] = useState([]);
    const [companyContracts, setCompanyContracts] = useState([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, companyId: null });
    const [notification, setNotification] = useState(null);

    const showToast = (type, title, message) => {
        setNotification({ type, title, message });
        setTimeout(() => setNotification(null), 4000);
    };

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) { navigate('/'); return; }
        fetchCompanies();
    }, [navigate]); 

    const fetchCompanies = async () => {
        try {
            const [compRes, devRes] = await Promise.all([api.get('/companies/'), api.get('/devices/')]);
            const formattedCompanies = compRes.data.map(comp => {
                const compDevices = devRes.data.filter(d => d.company == comp.id || String(d.company).toLowerCase() === String(comp.name).toLowerCase());
                let currentRisk = 'Low', currentStatus = 'Stable';
                
                if (compDevices.some(d => d.status === 'Critical')) { 
                    currentRisk = 'High'; currentStatus = 'Critical Issues'; 
                } else if (compDevices.some(d => d.status === 'Warning')) { 
                    currentRisk = 'Medium'; currentStatus = 'Needs Attention'; 
                }
                
                return { 
                    id: comp.id, 
                    name: comp.name, 
                    contact: comp.contact_email || 'No Email Provided', 
                    devices: compDevices.length, 
                    risk: currentRisk, 
                    status: currentStatus 
                };
            });
            setCompanies(formattedCompanies);
        } catch (error) {
            showToast('error', 'Data Error', 'Failed to load companies.');
        } finally {
            setIsLoading(false);
        }
    };

    const confirmDelete = (id, e) => {
        if(e) e.stopPropagation(); 
        setDeleteConfirm({ isOpen: true, companyId: id });
    };

    const executeDelete = async () => {
        const id = deleteConfirm.companyId;
        try {
            await api.delete(`/companies/${id}/`);
            setCompanies(companies.filter(c => c.id !== id));
            if (selectedCompany && selectedCompany.id === id) setSelectedCompany(null);
            showToast('success', 'Company Deleted', 'Company and all related data removed.');
        } catch (error) {
            showToast('error', 'Action Failed', 'Cannot delete this company. Backend error occurred.');
        } finally {
            setDeleteConfirm({ isOpen: false, companyId: null });
        }
    };

    const handleViewDetails = async (company) => {
        setSelectedCompany(company); 
        setIsLoadingDetails(true);
        try {
            const [devicesRes, contractsRes] = await Promise.all([api.get('/devices/'), api.get('/contracts/')]);
            setCompanyDevices(devicesRes.data.filter(d => d.company == company.id || String(d.company).toLowerCase() === String(company.name).toLowerCase()));
            setCompanyContracts(contractsRes.data.filter(c => c.company == company.id || String(c.company).toLowerCase() === String(company.name).toLowerCase()));
        } catch (error) { 
            showToast('error', 'Data Error', 'Failed to load details.'); 
        } finally { 
            setIsLoadingDetails(false); 
        }
    };

    const getContractStatus = (endDateString) => {
        if (!endDateString) return 'Unknown';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(endDateString);
        const diffTime = endDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays < 0) return 'Expired';
        if (diffDays <= 30) return 'Expiring Soon';
        return 'Active';
    };

    const filteredCompanies = companies.filter(company => 
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        (filterRisk === 'all' || company.risk.toLowerCase() === filterRisk.toLowerCase())
    );
    
    const getDeviceIcon = (type) => type === 'Laptop' ? <Laptop size={16} /> : <Monitor size={16} />;

    return (
        <div className="dashboard-root">
            <Sidebar />
            <main className="main-content">
                <div className="companies-container">
                    
                    {selectedCompany ? (
                        <div className="detail-view fade-in">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <button className="btn-back" onClick={() => setSelectedCompany(null)}>
                                    <ArrowLeft size={18} /> Back to Companies
                                </button>
                                <button className="btn-primary" style={{ backgroundColor: '#ef4444', border: 'none' }} onClick={(e) => confirmDelete(selectedCompany.id, e)}>
                                    <Trash2 size={16} /> Delete Company
                                </button>
                            </div>

                            <div className="detail-header-card">
                                <div className="company-title large">
                                    <div className="company-icon large">
                                        <Building2 size={28} />
                                    </div>
                                    <div>
                                        <h2>{selectedCompany.name}</h2>
                                        <p className="contact-text" style={{ color: selectedCompany.contact === 'No Email Provided' ? '#9ca3af' : 'inherit' }}>
                                            {selectedCompany.contact}
                                        </p>
                                    </div>
                                </div>
                                <div className="detail-stats">
                                    <div className="stat-box">
                                        <span className="stat-value">{companyDevices.length}</span>
                                        <span className="stat-label">Total Devices</span>
                                    </div>
                                    <div className="stat-box">
                                        <span className="stat-value">{companyContracts.length}</span>
                                        <span className="stat-label">Contracts</span>
                                    </div>
                                </div>
                            </div>
                            
                            {isLoadingDetails ? (
                                <div className="empty-state"><h3>Loading Details...</h3></div>
                            ) : (
                                <div className="detail-content-grid">
                                    {/* Contracts Table */}
                                    <div className="detail-section">
                                        <div className="section-header">
                                            <FileSignature size={18} className="text-muted" />
                                            <h3>Active & Past Contracts</h3>
                                        </div>
                                        <div className="table-wrapper">
                                            <table className="simple-table">
                                                <thead>
                                                    <tr>
                                                        <th>Duration</th>
                                                        <th>Value</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {companyContracts.length > 0 ? companyContracts.map(cont => {
                                                        const status = getContractStatus(cont.end_date);
                                                        return (
                                                            <tr key={cont.id}>
                                                                <td className="text-muted">{cont.start_date} to {cont.end_date}</td>
                                                                <td className="font-medium">{cont.value}</td>
                                                                <td>
                                                                    <span className={`status-badge risk-${status === 'Active' ? 'low' : status === 'Expired' ? 'high' : 'medium'}`}>
                                                                        {status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    }) : (
                                                        <tr><td colSpan="3" className="text-center text-muted py-4">No contracts found for this company.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Devices Table */}
                                    <div className="detail-section">
                                        <div className="section-header">
                                            <MonitorSmartphone size={18} className="text-muted" />
                                            <h3>Registered Devices</h3>
                                        </div>
                                        <div className="table-wrapper">
                                            <table className="simple-table">
                                                <thead>
                                                    <tr>
                                                        <th>Device Info</th>
                                                        <th>Serial Number</th>
                                                        <th>Health</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {companyDevices.length > 0 ? companyDevices.map(dev => (
                                                        <tr key={dev.id}>
                                                            <td>
                                                                <div className="flex-align gap-2">
                                                                    <span className="text-muted">{getDeviceIcon(dev.device_type)}</span>
                                                                    <span className="font-medium text-dark">{dev.name}</span>
                                                                </div>
                                                            </td>
                                                            <td className="font-mono text-muted">{dev.serial_number || 'N/A'}</td>
                                                            <td>
                                                                <span className={`status-badge risk-${dev.status === 'Healthy' ? 'low' : dev.status === 'Warning' ? 'medium' : 'high'}`}>
                                                                    {dev.status || 'Healthy'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    )) : (
                                                        <tr><td colSpan="3" className="text-center text-muted py-4">No devices registered for this company.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="fade-in">
                            <div className="page-header">
                                <div className="header-text">
                                    <h2>Client Companies</h2>
                                    <p>Manage and monitor all connected organizations and their hardware.</p>
                                </div>
                            </div>
                            <div className="controls-bar">
                                <div className="search-box">
                                    <Search size={18} className="search-icon" />
                                    <input type="text" placeholder="Search companies..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                </div>
                                <div className="filter-box">
                                    <select className="risk-filter" value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}>
                                        <option value="all">All Risk Levels</option>
                                        <option value="high">High Risk</option>
                                        <option value="medium">Medium Risk</option>
                                        <option value="low">Low Risk</option>
                                    </select>
                                </div>
                            </div>

                            {isLoading ? (
                                <div className="empty-state">
                                    <h3>Loading Companies...</h3>
                                </div>
                            ) : filteredCompanies.length > 0 ? (
                                <div className="companies-grid">
                                    {filteredCompanies.map((company) => (
                                        <div className="company-card" key={company.id}>
                                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <div className="company-title">
                                                    <div className="company-icon"><Building2 size={20} /></div>
                                                    <h3>{company.name}</h3>
                                                </div>
                                                <button onClick={(e) => confirmDelete(company.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                                    <Trash2 size={18} color="#ef4444" />
                                                </button>
                                            </div>
                                            <div className="card-body">
                                                <div className="info-row">
                                                    <MonitorSmartphone size={16} className="info-icon" />
                                                    <span><strong>{company.devices}</strong> Devices Monitored</span>
                                                </div>
                                                <div className="info-row">
                                                    {company.risk === 'High' ? <ShieldAlert size={16} color="#ef4444" /> :
                                                    company.risk === 'Medium' ? <ShieldAlert size={16} color="#f59e0b" /> :
                                                    <ShieldCheck size={16} color="#10b981" />}
                                                    <span className={`status-badge risk-${company.risk?.toLowerCase()}`}>
                                                        {company.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="card-footer">
                                                <button className="view-btn full-width" onClick={() => handleViewDetails(company)}>View Details</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <Building2 size={48} color="#9ca3af" />
                                    <h3>No companies found</h3>
                                    <p>Company list is currently empty.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Custom Delete Confirm Modal */}
            {deleteConfirm.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                            <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '50%' }}>
                                <AlertTriangle size={36} color="#ef4444" />
                            </div>
                        </div>
                        <h3 style={{ marginBottom: '12px' }}>Delete Company?</h3>
                        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                            Are you sure you want to completely delete this company? All related devices and contracts will be removed.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button className="btn-cancel" style={{ flex: 1 }} onClick={() => setDeleteConfirm({ isOpen: false, companyId: null })}>Cancel</button>
                            <button className="btn-primary" style={{ flex: 1, backgroundColor: '#ef4444', borderColor: '#ef4444' }} onClick={executeDelete}>Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
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

export default Companies;