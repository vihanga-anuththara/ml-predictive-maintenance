import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import api from '../services/api'; 
import Sidebar from '../components/Sidebar';
import './Technicians.css';
import { Search, Plus, Edit, Trash2, X, ClipboardList, CheckCircle, Clock, AlertCircle, User, CheckCircle2, AlertTriangle } from 'lucide-react';

function Technicians() {
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [contracts, setContracts] = useState([]); 
    const [systemUsers, setSystemUsers] = useState([]); 
    const [devices, setDevices] = useState([]); 
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    
    // Delete confirm 
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, taskId: null });
    
    const [formData, setFormData] = useState({
        id: '', displayId: '', technician: '', broughtBy: '', serviceType: 'In-house', date: '', deadline: '', 
        device: '', issue: '', specialNote: '', status: 'Pending'
    });

    const [notification, setNotification] = useState(null);

    const showToast = (type, title, message) => {
        setNotification({ type, title, message });
        setTimeout(() => setNotification(null), 4000);
    };

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            navigate('/'); 
            return;
        }

        fetchTasks();
        fetchContracts();
        fetchSystemUsers(); 
        fetchDevices(); 
    }, [navigate]);

    const fetchTasks = async () => {
        try {
            const response = await api.get('/tasks/');
            const formattedTasks = response.data.map(task => ({
                id: task.id,
                displayId: `TSK-100${task.id}`, 
                technician: task.technician, 
                broughtBy: task.brought_by,
                serviceType: task.service_type,
                date: task.date,
                deadline: task.deadline,
                device: task.device, 
                issue: task.issue,
                specialNote: task.special_note || '',
                status: task.status
            }));
            setTasks(formattedTasks);
        } catch (error) {
            console.error("Error fetching tasks:", error);
            showToast('error', 'Connection Error', 'Failed to load tasks.');
        }
    };

    const fetchContracts = async () => {
        try {
            const response = await api.get('/contracts/');
            setContracts(response.data);
        } catch (error) {
            console.error("Error fetching contracts:", error);
        }
    };

    const fetchSystemUsers = async () => {
        try {
            const response = await api.get('/system-users/');
            const activeUsers = response.data.filter(user => user.status === 'Active');
            setSystemUsers(activeUsers);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const fetchDevices = async () => {
        try {
            const response = await api.get('/devices/');
            setDevices(response.data);
        } catch (error) {
            console.error("Error fetching devices:", error);
        }
    };

    const getTechName = (id) => {
        const user = systemUsers.find(u => u.id === id);
        return user ? user.name : id;
    };

    const getDeviceName = (id) => {
        const dev = devices.find(d => d.id === id);
        return dev ? dev.name : id;
    };

    const getContractStatus = (companyName) => {
        const contract = contracts.find(c => c.company.toLowerCase() === companyName.toLowerCase());
        if (!contract) return 'No Contract';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(contract.end_date);
        const diffTime = endDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays < 0) return 'Expired';
        if (diffDays <= 30) return 'Expiring Soon';
        return 'Active';
    };

    const filteredTasks = tasks.filter(task => {
        const techName = getTechName(task.technician).toString().toLowerCase();
        const devName = getDeviceName(task.device).toString().toLowerCase();
        const search = searchTerm.toLowerCase();

        return techName.includes(search) ||
               devName.includes(search) ||
               task.issue.toLowerCase().includes(search) ||
               task.broughtBy.toLowerCase().includes(search);
    });

    const getStatusIcon = (status) => {
        switch(status) {
            case 'Completed': return <CheckCircle size={14} />;
            case 'In Progress': return <Clock size={14} />;
            default: return <AlertCircle size={14} />;
        }
    };

    const handleAdd = () => {
        setModalMode('add');
        const today = new Date().toISOString().split('T')[0];
        setFormData({ 
            id: '', displayId: '', technician: '', broughtBy: '', serviceType: 'In-house', date: today, deadline: '', 
            device: '', issue: '', specialNote: '', status: 'Pending' 
        });
        setIsModalOpen(true);
    };

    const handleEdit = (task) => {
        setModalMode('edit');
        setFormData({
            ...task,
            technician: getTechName(task.technician),
            device: getDeviceName(task.device)        
        });
        setIsModalOpen(true);
    };

    // Open custom model for delete button
    const confirmDelete = (id) => {
        setDeleteConfirm({ isOpen: true, taskId: id });
    };

    const executeDelete = async () => {
        const id = deleteConfirm.taskId;
        try {
            await api.delete(`/tasks/${id}/`);
            setTasks(tasks.filter(task => task.id !== id));
            showToast('success', 'Task Deleted', 'Task removed successfully.');
        } catch (error) {
            console.error("Error deleting task:", error);
            showToast('error', 'Action Failed', 'Could not delete the task.');
        } finally {
            setDeleteConfirm({ isOpen: false, taskId: null }); // Close the Model
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        const selectedTech = systemUsers.find(u => u.name === formData.technician);
        const selectedDevice = devices.find(d => d.name === formData.device);

        if (!selectedTech) {
            showToast('error', 'Validation Error', 'Please select a valid Technician from the dropdown.');
            return;
        }
        if (!selectedDevice) {
            showToast('error', 'Validation Error', 'Please select a valid Device from the dropdown.');
            return;
        }

        const payload = {
            technician: selectedTech.id, 
            device: selectedDevice.id,   
            service_type: formData.serviceType,
            brought_by: formData.broughtBy,
            date: formData.date,
            deadline: formData.deadline,
            status: formData.status,
            issue: formData.issue,
            special_note: formData.specialNote
        };

        try {
            if (modalMode === 'add') {
                await api.post('/tasks/', payload);
                showToast('success', 'Task Assigned', 'New maintenance task assigned successfully!');
            } else {
                await api.put(`/tasks/${formData.id}/`, payload);
                showToast('success', 'Task Updated', 'Task details updated successfully!');
            }
            setIsModalOpen(false);
            fetchTasks(); 
        } catch (error) {
            console.error("Error saving task:", error);
            if (error.response && error.response.data) {
                const errorMsg = typeof error.response.data === 'object' 
                                ? Object.values(error.response.data).join(' ') 
                                : 'Validation failed.';
                showToast('error', 'Save Failed', errorMsg);
            } else {
                showToast('error', 'Save Failed', 'An error occurred while saving the task.');
            }
        }
    };

    return (
        <div className="dashboard-root">
            <Sidebar />

            <main className="main-content">
                <div className="technicians-container">
                    
                    <div className="page-header">
                        <div className="header-text">
                            <h2>Task Assignments</h2>
                            <p>Assign maintenance tasks to technicians and track their progress.</p>
                        </div>
                        <button className="btn-primary" onClick={handleAdd}>
                            <Plus size={18} /> Assign New Task
                        </button>
                    </div>

                    <div className="controls-bar">
                        <div className="search-box">
                            <Search size={18} className="search-icon" />
                            <input 
                                type="text" 
                                placeholder="Search tasks by technician, device, company, or issue..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="table-card">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Task Info</th>
                                    <th>Client / Contract</th>
                                    <th>Assigned To</th>
                                    <th>Dates</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.map((task) => {
                                    const contractStatus = getContractStatus(task.broughtBy);
                                    
                                    return (
                                        <tr key={task.id}>
                                            <td>
                                                <div className="task-info-cell">
                                                    <ClipboardList size={20} className="text-muted" />
                                                    <div>
                                                        <div className="task-device">
                                                            <span style={{marginRight: '8px', fontSize: '0.8rem', color: '#6b7280'}}>{task.displayId}</span> 
                                                            {getDeviceName(task.device)}
                                                            <span className="service-type-badge">
                                                                {task.serviceType}
                                                            </span>
                                                        </div>
                                                        <div className="task-issue">{task.issue}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="client-info-cell">
                                                    <span className="client-name">{task.broughtBy}</span>
                                                    <span className={`contract-badge ${contractStatus.toLowerCase().replace(' ', '-')}`}>
                                                        {contractStatus}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="tech-assigned">
                                                    <User size={14} className="text-muted"/>
                                                    {getTechName(task.technician)}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="task-dates">
                                                    <span className="date-assigned">Assigned: {task.date}</span>
                                                    <span className="date-deadline">Deadline: {task.deadline}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${task.status.toLowerCase().replace(' ', '-')}`}>
                                                    {getStatusIcon(task.status)} {task.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button className="action-btn edit" onClick={() => handleEdit(task)} title="View/Edit Task">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button className="action-btn delete" onClick={() => confirmDelete(task.id)} title="Delete Task">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredTasks.length === 0 && (
                            <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                                <ClipboardList size={48} color="#9ca3af" style={{ margin: '0 auto', marginBottom: '16px' }} />
                                <h3>No tasks found</h3>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Custom Delete Confirmation Modal */}
            {deleteConfirm.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                            <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '50%' }}>
                                <AlertTriangle size={36} color="#ef4444" />
                            </div>
                        </div>
                        <h3 style={{ marginBottom: '12px', color: '#111827', fontSize: '1.25rem' }}>Delete Task?</h3>
                        <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '0.95rem', lineHeight: '1.5' }}>
                            Are you sure you want to delete this task? This action cannot be undone and will permanently remove it from the system.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button 
                                className="btn-cancel" 
                                style={{ flex: 1, padding: '10px' }} 
                                onClick={() => setDeleteConfirm({ isOpen: false, taskId: null })}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn-primary" 
                                style={{ flex: 1, padding: '10px', backgroundColor: '#ef4444', borderColor: '#ef4444' }} 
                                onClick={executeDelete}
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content large-modal">
                        <div className="modal-header">
                            <h3>{modalMode === 'add' ? 'Assign New Task' : 'Task Details & Update'}</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Assign to Technician</label>
                                        <input 
                                            list="technician-list"
                                            required 
                                            value={formData.technician} 
                                            onChange={(e) => setFormData({...formData, technician: e.target.value})} 
                                            placeholder="Type to select technician..." 
                                        />
                                        <datalist id="technician-list">
                                            {systemUsers.map(user => (
                                                <option key={user.id} value={user.name} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <div className="form-group">
                                        <label>Device Name</label>
                                        <input 
                                            list="device-list"
                                            required 
                                            value={formData.device} 
                                            onChange={(e) => setFormData({...formData, device: e.target.value})} 
                                            placeholder="Type to select device..." 
                                        />
                                        <datalist id="device-list">
                                            {devices.map(device => (
                                                <option key={device.id} value={device.name} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Service Type</label>
                                        <select value={formData.serviceType} onChange={(e) => setFormData({...formData, serviceType: e.target.value})}>
                                            <option value="In-house">In-house (At Workshop)</option>
                                            <option value="On-site">On-site (At Client Location)</option>
                                            <option value="Remote">Remote (Network Support)</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Client / Company</label>
                                        <input 
                                            list="company-list" 
                                            required 
                                            value={formData.broughtBy} 
                                            onChange={(e) => setFormData({...formData, broughtBy: e.target.value})} 
                                            placeholder="Type to select company..." 
                                        />
                                        <datalist id="company-list">
                                            {contracts.map(contract => (
                                                <option key={contract.id} value={contract.company} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Date Assigned</label>
                                        <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Deadline</label>
                                        <input type="date" required value={formData.deadline} onChange={(e) => setFormData({...formData, deadline: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Task Status</label>
                                        <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                                            <option value="Pending">Pending</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Reported Issue</label>
                                    <textarea required value={formData.issue} onChange={(e) => setFormData({...formData, issue: e.target.value})} placeholder="Describe the problem..." rows="2"></textarea>
                                </div>
                                <div className="form-group">
                                    <label>Special Note</label>
                                    <textarea value={formData.specialNote} onChange={(e) => setFormData({...formData, specialNote: e.target.value})} placeholder="Any special instructions..." rows="2"></textarea>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">
                                    {modalMode === 'add' ? 'Assign Task' : 'Update Task'}
                                </button>
                            </div>
                        </form>
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

export default Technicians;