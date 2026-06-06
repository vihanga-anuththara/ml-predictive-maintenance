import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; 
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import './MaintenanceLogs.css';
import { 
    Search, Wrench, Calendar, Download, Plus, X, 
    Activity, HardDrive, CheckCircle2, AlertTriangle, Info
} from 'lucide-react';

function MaintenanceLogs() {
    const navigate = useNavigate();
    const location = useLocation(); 

    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [validDevices, setValidDevices] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [serialSearch, setSerialSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedDeviceId, setSelectedDeviceId] = useState(null);

    const [isHardwareReplaced, setIsHardwareReplaced] = useState(false);

    const [formData, setFormData] = useState({
        hard_drive_health: '',
        past_failure_attempts: '0',
        repair_history_count: '0',
        predicted_risk_level: 'Low'
    });

    const [notification, setNotification] = useState(null);

    const showToast = (type, title, message) => {
        setNotification({ type, title, message });
        setTimeout(() => setNotification(null), 4000);
    };

    useEffect(() => {
        const h = parseFloat(formData.hard_drive_health);
        const f = parseInt(formData.past_failure_attempts);
        const r = parseInt(formData.repair_history_count);

        const safeH = isNaN(h) ? 100 : h;
        const safeF = isNaN(f) ? 0 : f;
        const safeR = isNaN(r) ? 0 : r;

        let calculatedRisk = 'Low';
        if (safeH < 50 || safeF >= 3 || safeR >= 3) {
            calculatedRisk = 'High';
        } else if (safeH < 75 || safeF > 0 || safeR > 0) {
            calculatedRisk = 'Medium';
        }

        if (formData.predicted_risk_level !== calculatedRisk) {
            setFormData(prev => ({ ...prev, predicted_risk_level: calculatedRisk }));
        }
    }, [formData.hard_drive_health, formData.past_failure_attempts, formData.repair_history_count]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleHardwareReplaceToggle = (e) => {
        const isChecked = e.target.checked;
        setIsHardwareReplaced(isChecked);
        
        if (isChecked) {
            setFormData(prev => ({
                ...prev,
                hard_drive_health: '100',
                past_failure_attempts: '0',
                repair_history_count: '0'
            }));
            showToast('success', 'Counters Reset', 'Metrics reset to default for newly replaced hardware.');
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) { navigate('/'); return; }
        fetchInitialData();
    }, [navigate, location]); 

    const fetchInitialData = async () => {
        try {
            setIsLoading(true);
            const [logsRes, devicesRes] = await Promise.all([
                api.get('/device-health-logs/'), 
                api.get('/devices/') 
            ]);

            const fetchedDevices = devicesRes.data;
            setValidDevices(fetchedDevices);

            const formattedLogs = logsRes.data.map(log => {
                const deviceObj = fetchedDevices.find(d => d.id === log.device);
                return {
                    id: `LOG-100${log.id}`,
                    realId: log.id,
                    rawDeviceId: log.device, 
                    deviceName: deviceObj ? deviceObj.name : `Device #${log.device}`,
                    companyName: deviceObj ? deviceObj.company : 'Unknown Company',
                    date: log.timestamp ? log.timestamp.split('T')[0] : 'N/A',
                    health: log.hard_drive_health,
                    fails: log.past_failure_attempts,
                    repairs: log.repair_history_count, 
                    risk: log.predicted_risk_level || 'Low'
                };
            }).sort((a, b) => b.realId - a.realId); // sort for new logs

            setLogs(formattedLogs);

            if (location.state && location.state.autoSelectSerial) {
                const passedSerial = location.state.autoSelectSerial;
                const matchedDevice = fetchedDevices.find(d => d.serial_number === passedSerial);

                if (matchedDevice) {
                    handleSelectDevice(matchedDevice, formattedLogs);
                    setIsModalOpen(true);
                    navigate(location.pathname, { replace: true, state: {} });
                }
            }

        } catch (error) {
            console.error("Error fetching data:", error);
            showToast('error', 'Connection Error', 'Failed to load data.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectDevice = (device, currentLogs = logs) => {
        setSerialSearch(device.serial_number);
        setSelectedDeviceId(device.id);
        setShowSuggestions(false);
        setIsHardwareReplaced(false);

        const oldLog = currentLogs.find(l => l.rawDeviceId === device.id);
        
        if (oldLog) {
            setFormData({
                hard_drive_health: oldLog.health,
                past_failure_attempts: oldLog.fails,
                repair_history_count: oldLog.repairs || 0,
                predicted_risk_level: 'Low' 
            });
            showToast('success', 'Data Loaded', 'Previous health data fetched for this device.');
        } else {
            setFormData({
                hard_drive_health: '',
                past_failure_attempts: '0',
                repair_history_count: '0',
                predicted_risk_level: 'Low'
            });
        }
    };

    const handleSaveLog = async (e) => {
        e.preventDefault();
        
        if (!selectedDeviceId) {
            showToast('error', 'Validation Error', 'Please search and select a valid Device Serial Number.');
            return;
        }

        try {
            await api.post('/device-health-logs/', {
                device: selectedDeviceId, 
                hard_drive_health: parseFloat(formData.hard_drive_health),
                past_failure_attempts: parseInt(formData.past_failure_attempts),
                repair_history_count: parseInt(formData.repair_history_count),
                predicted_risk_level: formData.predicted_risk_level
            });

            let newDeviceStatus = 'Healthy';
            if (formData.predicted_risk_level === 'High') newDeviceStatus = 'Critical';
            if (formData.predicted_risk_level === 'Medium') newDeviceStatus = 'Warning';

            try {
                await api.patch(`/devices/${selectedDeviceId}/`, { status: newDeviceStatus });
            } catch (patchErr) {
                console.error("Failed to update device status", patchErr);
            }
            
            showToast('success', 'Log Saved', 'Health log recorded and device status updated!');
            setIsModalOpen(false);
            
            setSerialSearch('');
            setSelectedDeviceId(null);
            setIsHardwareReplaced(false);
            setFormData({ hard_drive_health: '', past_failure_attempts: '0', repair_history_count: '0', predicted_risk_level: 'Low' });
            
            fetchInitialData(); 
            
        } catch (error) {
            console.error("Error saving log:", error);
            showToast('error', 'Save Failed', 'Could not save the health log. Check inputs.');
        }
    };

    // Send data to export (If used filters, only send filtered data)
    const handleExportCSV = () => {
        if (filteredLogs.length === 0) return;
        const headers = ['Log ID', 'Date', 'Device Name', 'Company Name', 'Drive Health (%)', 'Past Fails', 'Risk Level'];
        const csvRows = [headers.join(','), ...filteredLogs.map(l => `"${l.id}","${l.date}","${l.deviceName}","${l.companyName}","${l.health}","${l.fails}","${l.risk}"`)].join('\n');
        const blob = new Blob([csvRows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `maintenance_logs_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const filteredLogs = logs.filter(log => 
        log.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        log.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Display limited data for logs, display data for filters
    const DISPLAY_LIMIT = 20;
    const displayedLogsForTable = searchTerm === '' ? filteredLogs.slice(0, DISPLAY_LIMIT) : filteredLogs;

    const suggestedDevices = validDevices.filter(d => 
        d.serial_number && d.serial_number.toLowerCase().includes(serialSearch.toLowerCase())
    );

    const getRiskColor = (risk) => {
        switch(risk) {
            case 'High': return '#ef4444'; case 'Medium': return '#f59e0b'; case 'Low': return '#10b981'; default: return '#6b7280';
        }
    };

    return (
        <div className="dashboard-root">
            <Sidebar />

            <main className="main-content">
                <div className="logs-container">
                    <div className="page-header">
                        <div className="header-text">
                            <h2>Health Logs (ML Inputs)</h2>
                            <p>Record hardware metrics for AI Risk Prediction.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn-secondary" onClick={handleExportCSV}>
                                <Download size={18} /> Export CSV
                            </button>
                            <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                                <Plus size={18} /> Add Log
                            </button>
                        </div>
                    </div>

                    <div className="controls-bar">
                        <div className="search-box">
                            <Search size={18} className="search-icon" />
                            <input type="text" placeholder="Search by device or company..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <div className="logs-card">
                        <div className="table-container">
                            <table className="logs-table">
                                <thead>
                                    <tr><th>Log ID</th><th>Date</th><th>Device & Company</th><th>Drive Health</th><th>Past Fails</th><th>Risk Level</th></tr>
                                </thead>
                                <tbody>
                                    {isLoading ? <tr><td colSpan="6" style={{textAlign:'center', padding: '30px'}}>Loading...</td></tr> : displayedLogsForTable.map((log) => (
                                        <tr key={log.id}>
                                            <td className="log-id font-mono">{log.id}</td>
                                            <td><div className="date-cell"><Calendar size={14} className="icon-muted" />{log.date}</div></td>
                                            <td><div className="device-name font-semibold">{log.deviceName}</div><div className="company-name text-muted">{log.companyName}</div></td>
                                            <td><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><HardDrive size={14} color={log.health < 50 ? '#ef4444' : '#10b981'} /><span style={{ fontWeight: '600' }}>{log.health}%</span></div></td>
                                            <td style={{ fontWeight: '600', paddingLeft: '15px' }}>{log.fails}</td>
                                            <td>
                                                <span style={{ backgroundColor: `${getRiskColor(log.risk)}20`, color: getRiskColor(log.risk), padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                    <Activity size={14} /> {log.risk}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {!isLoading && displayedLogsForTable.length === 0 && (
                                <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                                    <Wrench size={48} color="#9ca3af" style={{ margin: '0 auto', marginBottom: '16px' }} />
                                    <h3>No health logs found</h3>
                                    <p style={{ color: '#6b7280' }}>Click "Add Log" to record hardware metrics.</p>
                                </div>
                            )}

                            {/* Display a message for limited 20 logs */}
                            {!isLoading && searchTerm === '' && filteredLogs.length > DISPLAY_LIMIT && (
                                <div style={{ 
                                    textAlign: 'center', padding: '12px', color: '#6b7280', 
                                    fontSize: '0.85rem', backgroundColor: '#f9fafb', 
                                    borderTop: '1px solid #e5e7eb', display: 'flex', 
                                    alignItems: 'center', justifyContent: 'center', gap: '6px' 
                                }}>
                                    <Info size={14} color="#3b82f6" />
                                    Showing the latest {DISPLAY_LIMIT} logs. Use the search bar to find older records.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Add Log Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>Add Device Health Log</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveLog}>
                            <div className="modal-body">
                                
                                <div className="form-group" style={{ position: 'relative' }}>
                                    <label>Search Device Serial Number</label>
                                    <input 
                                        type="text"
                                        required 
                                        value={serialSearch}
                                        onChange={(e) => {
                                            setSerialSearch(e.target.value);
                                            setShowSuggestions(true);
                                            setSelectedDeviceId(null); 
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        placeholder="Type serial number to search..." 
                                        autoComplete="off"
                                    />
                                    {showSuggestions && serialSearch && (
                                        <ul style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0, 
                                            background: '#fff', border: '1px solid #e5e7eb', 
                                            borderRadius: '6px', maxHeight: '150px', overflowY: 'auto', 
                                            listStyle: 'none', padding: 0, margin: '4px 0 0 0', 
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 50
                                        }}>
                                            {suggestedDevices.length > 0 ? (
                                                suggestedDevices.map(dev => (
                                                    <li 
                                                        key={dev.id} 
                                                        onMouseDown={() => handleSelectDevice(dev)} 
                                                        style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: '0.9rem' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        <strong style={{ color: '#2563eb' }}>{dev.serial_number}</strong> - {dev.name} ({dev.company})
                                                    </li>
                                                ))
                                            ) : (
                                                <li style={{ padding: '10px 12px', color: '#ef4444', fontSize: '0.9rem' }}>No devices found</li>
                                            )}
                                        </ul>
                                    )}
                                </div>

                                {selectedDeviceId && (
                                    <div className="form-row" style={{ marginTop: '15px', marginBottom: '15px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', width: '100%' }}>
                                            <input
                                                type="checkbox"
                                                checked={isHardwareReplaced}
                                                onChange={handleHardwareReplaceToggle}
                                                style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                                            />
                                            <span style={{ fontWeight: '600', color: '#065f46', fontSize: '0.9rem' }}>Major Hardware Replaced (New HDD/Motherboard)</span>
                                        </label>
                                    </div>
                                )}

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Hard Drive Health (%)</label>
                                        <input type="number" name="hard_drive_health" min="0" max="100" step="0.1" required value={formData.hard_drive_health} onChange={handleInputChange} placeholder="e.g. 85.5" disabled={isHardwareReplaced} />
                                    </div>
                                    <div className="form-group">
                                        <label>Past Failures (Count)</label>
                                        <input type="number" name="past_failure_attempts" min="0" required value={formData.past_failure_attempts} onChange={handleInputChange} disabled={isHardwareReplaced} />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Repair History Count</label>
                                        <input type="number" name="repair_history_count" min="0" required value={formData.repair_history_count} onChange={handleInputChange} disabled={isHardwareReplaced} />
                                    </div>
                                    <div className="form-group">
                                        <label>Risk Level (Auto-Calculated)</label>
                                        <select 
                                            name="predicted_risk_level" 
                                            value={formData.predicted_risk_level} 
                                            disabled 
                                            style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: getRiskColor(formData.predicted_risk_level), fontWeight: 'bold' }}
                                        >
                                            <option value="Low">Low Risk</option>
                                            <option value="Medium">Medium Risk</option>
                                            <option value="High">High Risk</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <Activity size={14} color="#f59e0b" />
                                    <span>Risk is auto-calculated. Saves directly to ML dataset.</span>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">Save Log</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {notification && (
                <div className="toast-container">
                    <div className={`toast-message ${notification.type}`}><div className="toast-icon">{notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}</div><div className="toast-content"><div className="toast-title">{notification.title}</div><div className="toast-desc">{notification.message}</div></div><button className="toast-close" onClick={() => setNotification(null)}><X size={16} /></button></div>
                </div>
            )}
        </div>
    );
}

export default MaintenanceLogs;