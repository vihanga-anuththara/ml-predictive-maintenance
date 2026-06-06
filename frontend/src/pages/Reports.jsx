import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../services/api'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Reports.css';
import { 
    FileText, Download, Calendar, Activity, 
    CheckCircle2, AlertTriangle, X, Trash2, 
    ClipboardList, FileSignature, MonitorSmartphone, Users, Loader2 
} from 'lucide-react';

function Reports() {
    const [recentReports, setRecentReports] = useState([]);
    const [notification, setNotification] = useState(null);

    const [downloadModal, setDownloadModal] = useState({ isOpen: false, reportType: '' });
    const [isGenerating, setIsGenerating] = useState(false); 

    const showToast = (type, title, message) => {
        setNotification({ type, title, message });
        setTimeout(() => setNotification(null), 4000);
    };

    const handleClearHistory = () => {
        setRecentReports([]);
        showToast('success', 'History Cleared', 'Recent report logs have been cleared completely.');
    };

    const openDownloadModal = (type) => {
        setDownloadModal({ isOpen: true, reportType: type });
    };

    const executeDownloadAndLog = async (format) => {
        setIsGenerating(true);
        const type = downloadModal.reportType;
        const today = new Date().toISOString().split('T')[0];
        const newId = `REP-${Math.floor(1000 + Math.random() * 9000)}`;

        let columns = [];
        let finalReportData = []; // Report data list

        try {
            // 1. Task Assignment Report Logic (Devices, Users, Tasks)
            if (type === 'Task Assignment') {
                columns = [
                    { label: 'Device Serial Number', key: 'serial_number' },
                    { label: 'Technician Name', key: 'technician_name' },
                    { label: 'Status', key: 'status' },
                    { label: 'Date', key: 'date' },
                    { label: 'Company Name', key: 'company' }
                ];

                const [tasksRes, devicesRes, usersRes] = await Promise.all([
                    api.get('/tasks/'),
                    api.get('/devices/'),
                    api.get('/system-users/')
                ]);

                const tasks = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data.results || []);
                const devices = Array.isArray(devicesRes.data) ? devicesRes.data : (devicesRes.data.results || []);
                const users = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data.results || []);

                finalReportData = tasks.map(task => {
                    const matchedDevice = devices.find(d => String(d.id) === String(task.device)) || {};
                    const matchedUser = users.find(u => String(u.id) === String(task.technician)) || {};

                    // Full Name 
                    let techName = 'Unassigned';
                    if (matchedUser.first_name || matchedUser.last_name) {
                        techName = `${matchedUser.first_name || ''} ${matchedUser.last_name || ''}`.trim();
                    } else if (matchedUser.name || matchedUser.username) {
                        techName = matchedUser.name || matchedUser.username;
                    }

                    return {
                        serial_number: matchedDevice.serial_number || 'N/A',
                        technician_name: techName,
                        status: task.status || 'N/A',
                        date: task.date || task.created_at?.split('T')[0] || 'N/A',
                        company: task.brought_by || 'N/A' // Company name 
                    };
                });

            } 
            // 2. Contracts Report Logic
            else if (type === 'Contracts') {
                columns = [
                    { label: 'Contract ID', key: 'id' },
                    { label: 'Company Name', key: 'company' },
                    { label: 'Start Date', key: 'start_date' },
                    { label: 'End Date', key: 'end_date' },
                    { label: 'Value', key: 'value' }
                ];
                const res = await api.get('/contracts/');
                const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
                finalReportData = data.map(item => ({
                    id: item.id || 'N/A',
                    company: typeof item.company === 'object' ? item.company.name : (item.company || 'N/A'),
                    start_date: item.start_date || 'N/A',
                    end_date: item.end_date || 'N/A',
                    value: item.value || 'N/A'
                }));

            } 
            // 3. Company Devices Report Logic
            else if (type === 'Company Devices') {
                columns = [
                    { label: 'Serial Number', key: 'serial_number' },
                    { label: 'Device Name', key: 'name' },
                    { label: 'Company Name', key: 'company' },
                    { label: 'Status', key: 'status' }
                ];
                const res = await api.get('/devices/');
                const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
                finalReportData = data.map(item => ({
                    serial_number: item.serial_number || 'N/A',
                    name: item.name || 'N/A',
                    company: typeof item.company === 'object' ? item.company.name : (item.company || 'N/A'),
                    status: item.status || 'N/A'
                }));

            } 
            // 4. User Management Report Logic
            else if (type === 'User Management') {
                columns = [
                    { label: 'Full Name', key: 'full_name' },
                    { label: 'Role', key: 'role' },
                    { label: 'Email', key: 'email' }
                ];
                const res = await api.get('/system-users/');
                const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
                finalReportData = data.map(item => {
                    let fullName = 'N/A';
                    if (item.first_name || item.last_name) {
                        fullName = `${item.first_name || ''} ${item.last_name || ''}`.trim();
                    } else if (item.full_name || item.name || item.username) {
                        fullName = item.full_name || item.name || item.username;
                    }
                    return {
                        full_name: fullName,
                        role: item.role || (item.is_superuser ? 'Admin' : 'Technician') || 'N/A',
                        email: item.email || 'No Email'
                    };
                });
            }

            // If data is empty, display an error message
            if (finalReportData.length === 0) {
                showToast('error', 'Empty Data', 'No records found for this report.');
                setIsGenerating(false);
                setDownloadModal({ isOpen: false, reportType: '' });
                return;
            }

            const generatedBy = localStorage.getItem('username') || 'System Admin';

            // CSV Generation Logic
            if (format === 'CSV') {
                const headers = columns.map(c => c.label).join(',');
                const rows = finalReportData.map(item => 
                    columns.map(c => {
                        let val = String(item[c.key] || '');
                        val = val.replace(/"/g, '""'); // Avoid quotes
                        return `"${val}"`;
                    }).join(',')
                ).join('\n');
                
                const csvContent = `\uFEFF${headers}\n${rows}`; // UTF-8 BOM
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const filename = `${type.replace(/\s+/g, '_').toLowerCase()}_${today}.csv`;

                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

            } 
            // PDF Generation Logic
            else if (format === 'PDF') {
                const doc = new jsPDF();
                const filename = `${type.replace(/\s+/g, '_').toLowerCase()}_${today}.pdf`;

                doc.setFontSize(18);
                doc.setTextColor(37, 99, 235);
                doc.text(`${type.toUpperCase()} REPORT`, 14, 22);

                doc.setFontSize(10);
                doc.setTextColor(75, 85, 99);
                doc.text(`Report ID: ${newId}`, 14, 32);
                doc.text(`Date Generated: ${today}`, 14, 38);
                doc.text(`Generated By: ${generatedBy}`, 14, 44);
                doc.text(`Total Records: ${finalReportData.length}`, 14, 50);

                const tableHead = [columns.map(c => c.label)];
                const tableBody = finalReportData.map(item => 
                    columns.map(c => String(item[c.key] || ''))
                );

                autoTable(doc, {
                    startY: 58,
                    head: tableHead,
                    body: tableBody,
                    theme: 'grid',
                    styles: { fontSize: 9, cellPadding: 3 },
                    headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
                    alternateRowStyles: { fillColor: [243, 244, 246] }
                });

                doc.save(filename);
            }

            // Update Report Logs in UI
            const newReportLog = {
                id: newId,
                name: `${type} Data Export`,
                type: type,
                date: today,
                generatedBy: generatedBy,
                format: format
            };
            setRecentReports([newReportLog, ...recentReports]);

            showToast('success', 'Download Complete', `${format} file downloaded successfully.`);
            setDownloadModal({ isOpen: false, reportType: '' });

        } catch (error) {
            console.error("Data Fetch Error:", error);
            showToast('error', 'Generation Failed', 'Could not fetch data. API might be down.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleReDownload = (report) => {
        setDownloadModal({ isOpen: true, reportType: report.type });
    };

    return (
        <div className="dashboard-root">
            <Sidebar />

            <main className="main-content">
                <div className="reports-container">
                    
                    <div className="page-header">
                        <div className="header-text">
                            <h2>Analytics & Reports</h2>
                            <p>Generate insights, monitor ML model accuracy, and export system data.</p>
                        </div>
                        <button className="btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={handleClearHistory}>
                            <Trash2 size={18} /> Clear Generated Reports
                        </button>
                    </div>

                    <h3 className="section-title">Standard Reports</h3>
                    <div className="templates-grid">
                        
                        <div className="template-card">
                            <div className="template-icon orange"><ClipboardList size={24} /></div>
                            <h4>Task Assignment</h4>
                            <p>Detailed logs of all maintenance tasks and assignments.</p>
                            <button className="generate-btn" onClick={() => openDownloadModal('Task Assignment')}>Generate Now</button>
                        </div>

                        <div className="template-card">
                            <div className="template-icon green"><FileSignature size={24} /></div>
                            <h4>Contracts</h4>
                            <p>Overview of client service agreements and expiration data.</p>
                            <button className="generate-btn" onClick={() => openDownloadModal('Contracts')}>Generate Now</button>
                        </div>
                        
                        <div className="template-card">
                            <div className="template-icon blue"><MonitorSmartphone size={24} /></div>
                            <h4>Company Devices</h4>
                            <p>Hardware assets mapped by client companies and statuses.</p>
                            <button className="generate-btn" onClick={() => openDownloadModal('Company Devices')}>Generate Now</button>
                        </div>

                        <div className="template-card">
                            <div className="template-icon purple"><Users size={24} /></div>
                            <h4>User Management</h4>
                            <p>Extract basic user details (Name, Role, and Email only).</p>
                            <button className="generate-btn" onClick={() => openDownloadModal('User Management')}>Generate Now</button>
                        </div>
                    </div>

                    <div className="recent-reports-section">
                        <div className="section-header">
                            <h3 className="section-title">Recent Last 30 Days Report Generate Log Data</h3>
                            <div className="date-filter">
                                <Calendar size={16} /> Last 30 Days
                            </div>
                        </div>

                        <div className="table-card">
                            <table className="reports-table">
                                <thead>
                                    <tr>
                                        <th>Report Name</th>
                                        <th>Report Type</th>
                                        <th>Generated Date</th>
                                        <th>Generated By</th>
                                        <th>Format</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentReports.length > 0 ? recentReports.map((report) => (
                                        <tr key={report.id}>
                                            <td className="report-name-cell">
                                                <FileText size={16} className="text-muted" />
                                                <span className="font-medium text-dark">{report.name}</span>
                                            </td>
                                            <td><span className="report-type-badge">{report.type}</span></td>
                                            <td className="text-muted">{report.date}</td>
                                            <td className="text-muted">{report.generatedBy}</td>
                                            <td>
                                                <span className={`format-badge ${report.format.toLowerCase()}`}>
                                                    {report.format}
                                                </span>
                                            </td>
                                            <td>
                                                <button 
                                                    className="download-btn" 
                                                    title="Download Report"
                                                    onClick={() => handleReDownload(report)}
                                                >
                                                    <Download size={16} /> Download
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                                                <Activity size={32} style={{ margin: '0 auto', marginBottom: '10px', color: '#9ca3af' }} />
                                                No recent report generation logs found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </main>

            {/* Modal */}
            {downloadModal.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                            <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '50%' }}>
                                <Download size={36} color="#3b82f6" />
                            </div>
                        </div>
                        <h3 style={{ marginBottom: '8px' }}>Select Download Format</h3>
                        <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '0.9rem' }}>
                            Choose a file format to generate the <strong>{downloadModal.reportType}</strong> report.
                        </p>
                        
                        <div style={{ backgroundColor: '#fffbeb', color: '#b45309', padding: '10px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '20px', textAlign: 'left', border: '1px solid #fde68a' }}>
                            <strong>Note:</strong> If this report contains Sinhala names (e.g., Usernames or Technicians), please download as <strong>CSV</strong>. PDF does not support Sinhala fonts correctly.
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button 
                                className="btn-primary" 
                                style={{ flex: 1, backgroundColor: '#10b981', borderColor: '#10b981' }} 
                                onClick={() => executeDownloadAndLog('CSV')}
                                disabled={isGenerating}
                            >
                                {isGenerating ? <Loader2 size={16} className="spin-animation" /> : 'Download CSV'}
                            </button>
                            <button 
                                className="btn-primary" 
                                style={{ flex: 1, backgroundColor: '#ef4444', borderColor: '#ef4444' }} 
                                onClick={() => executeDownloadAndLog('PDF')}
                                disabled={isGenerating}
                            >
                                {isGenerating ? <Loader2 size={16} className="spin-animation" /> : 'Download PDF'}
                            </button>
                        </div>
                        <button 
                            className="btn-cancel" 
                            style={{ width: '100%', marginTop: '12px' }} 
                            onClick={() => setDownloadModal({ isOpen: false, reportType: '' })}
                            disabled={isGenerating}
                        >
                            Cancel
                        </button>
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
                        <button className="toast-close" onClick={() => setNotification(null)}>
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Reports;