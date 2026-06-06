import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import './RiskMonitor.css';
import { AlertTriangle, Activity, CheckCircle2, ShieldAlert, Cpu, X, Bot, Loader2, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function RiskMonitor() {
    const navigate = useNavigate();
    
    // States for ML Data
    const [companyRiskData, setCompanyRiskData] = useState([]);
    const [criticalAlerts, setCriticalAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [aiModal, setAiModal] = useState({ isOpen: false, device: '', advice: '' });
    const [loadingDeviceId, setLoadingDeviceId] = useState(null);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [notification, setNotification] = useState(null);
    const showToast = (type, title, message) => {
        setNotification({ type, title, message });
        setTimeout(() => setNotification(null), 4000);
    };

    // Dynamic Calculations
    const totalHighRisk = companyRiskData.reduce((sum, item) => sum + item.HighRisk, 0);
    const totalMediumRisk = companyRiskData.reduce((sum, item) => sum + item.MediumRisk, 0);
    const totalDevices = companyRiskData.reduce((sum, item) => sum + item.HighRisk + item.MediumRisk + item.Healthy, 0);
    const top5CompanyData = [...companyRiskData]
        .map(company => {
            const totalCompanyDevices = company.HighRisk + company.MediumRisk + company.Healthy;
            const riskPercentage = totalCompanyDevices > 0 ? (company.HighRisk / totalCompanyDevices) * 100 : 0;
            return { ...company, riskPercentage };
        })
        .sort((a, b) => b.riskPercentage - a.riskPercentage)
        .slice(0, 5); 

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) { navigate('/'); return; }
        fetchRealData();
    }, [navigate]);

    const fetchRealData = async () => {
        try {
            setIsLoading(true);
            const [companiesRes, mlRisksRes] = await Promise.all([
                api.get('/companies/'),
                api.get('/device-risks/')
            ]);
            const riskByCompany = {};
            const criticalDevices = [];
            const latestLogsByDevice = {};

            // Initialize all companies
            companiesRes.data.forEach(c => {
                riskByCompany[c.name] = { company: c.name, HighRisk: 0, MediumRisk: 0, Healthy: 0 };
            });

            // Select new log
            // Sort data by ID
            const sortedAllLogs = [...mlRisksRes.data].sort((a, b) => b.id - a.id);
            
            sortedAllLogs.forEach(mlData => {
                // If device has no logs, select latest one
                if (!latestLogsByDevice[mlData.device]) {
                    latestLogsByDevice[mlData.device] = mlData;
                }
            });

            // Calculate using latest logs
            Object.values(latestLogsByDevice).forEach(mlData => {
                // Get company name from "(Company Name)"
                const match = mlData.device.match(/\(([^)]+)\)$/);
                const compName = match ? match[1] : 'Unknown';

                if (!riskByCompany[compName]) {
                    riskByCompany[compName] = { company: compName, HighRisk: 0, MediumRisk: 0, Healthy: 0 };
                }

                if (mlData.riskLevel === 'High') {
                    riskByCompany[compName].HighRisk += 1;
                    criticalDevices.push({ ...mlData, companyName: compName });
                } else if (mlData.riskLevel === 'Medium') {
                    riskByCompany[compName].MediumRisk += 1;
                } else {
                    riskByCompany[compName].Healthy += 1;
                }
            });
            // Sort by Probability. If probability is same, give priority to new ID (Tie-Breaker)
            criticalDevices.sort((a, b) => {
                if (b.probability !== a.probability) {
                    return b.probability - a.probability;
                }
                return b.id - a.id; 
            });
            setCompanyRiskData(Object.values(riskByCompany).filter(c => c.HighRisk > 0 || c.MediumRisk > 0 || c.Healthy > 0));
            setCriticalAlerts(criticalDevices);

        } catch (error) {
            console.error("Error fetching monitored data:", error);
            showToast('error', 'Data Error', 'Failed to load risk data.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAskGemini = async (deviceData) => {
        setLoadingDeviceId(deviceData.id);
        try {
            const response = await api.post('/predict-risk/', {
                device_age_months: deviceData.age,
                disk_usage_percent: deviceData.disk,
                cpu_temp_avg: deviceData.cpu,
                ram_usage_percent: deviceData.ram,
                past_failure_count: deviceData.pastFails,
                days_since_last_maintenance: deviceData.daysSinceMaint
            });
            
            setAiModal({
                isOpen: true,
                device: deviceData.device,
                advice: response.data.ai_advice
            });
            
        } catch (error) {
            showToast('error', 'AI Connection Failed', 'Error connecting to Gemini AI. Check your network or API Key.');
        } finally {
            setLoadingDeviceId(null); 
        }
    };

    // Company select when click the chart
    const handleChartClick = (data) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const clickedCompany = data.activePayload[0].payload.company;
            // Remove filter when click same company again
            setSelectedCompany(prev => prev === clickedCompany ? null : clickedCompany);
        }
    };

    // Get Top 10 by selected company
    const displayedAlerts = selectedCompany 
        ? criticalAlerts.filter(alert => alert.companyName === selectedCompany).slice(0, 10)
        : criticalAlerts.slice(0, 10);

    return (
        <div className="dashboard-root">
            <Sidebar />
            <main className="main-content">
                <div className="risk-container">
                    <div className="page-header">
                        <div className="header-text">
                            <h2>ML Risk Monitor</h2>
                            <p>Real-time machine learning predictions mapped by company.</p>
                        </div>
                    </div>
                    
                    <div className="risk-summary-grid">
                        <div className="summary-widget critical">
                            <div className="widget-icon"><AlertTriangle size={24} /></div>
                            <div className="widget-info">
                                <h3>Total Critical Risks</h3>
                                <span>{isLoading ? '...' : totalHighRisk} Devices</span>
                            </div>
                        </div>
                        <div className="summary-widget warning">
                            <div className="widget-icon"><Activity size={24} /></div>
                            <div className="widget-info">
                                <h3>Total Medium Risks</h3>
                                <span>{isLoading ? '...' : totalMediumRisk} Devices</span>
                            </div>
                        </div>
                        <div className="summary-widget healthy">
                            <div className="widget-icon"><CheckCircle2 size={24} /></div>
                            <div className="widget-info">
                                <h3>Total Monitored</h3>
                                <span>{isLoading ? '...' : totalDevices} Devices</span>
                            </div>
                        </div>
                    </div>

                    <div className="chart-section" style={{ background: 'white', padding: '20px', borderRadius: '12px', marginTop: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '1.1rem', color: '#374151', margin: 0 }}>
                                Top 5 Companies by High Risk Percentage
                            </h3>
                            <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>*Click on a bar to filter devices</span>
                        </div>
                        
                        {isLoading ? (
                            <div style={{ textAlign: 'center', padding: '50px 0', color: '#6b7280' }}>Loading Chart Data...</div>
                        ) : companyRiskData.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '50px 0', color: '#6b7280' }}>No device data available to display.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={350}>
                                {/* Chart onClick Event */}
                                <BarChart data={top5CompanyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} onClick={handleChartClick}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="company" />
                                    <YAxis />
                                    <Tooltip cursor={{fill: '#f3f4f6'}} />
                                    <Legend />
                                    <Bar dataKey="HighRisk" stackId="a" fill="#ef4444" name="High Risk" style={{ cursor: 'pointer' }} />
                                    <Bar dataKey="MediumRisk" stackId="a" fill="#f59e0b" name="Medium Risk" style={{ cursor: 'pointer' }} />
                                    <Bar dataKey="Healthy" stackId="a" fill="#10b981" name="Healthy" style={{ cursor: 'pointer' }} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="critical-alerts-section" style={{ marginTop: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="section-title">
                                Top 10 Critical Devices (Requires AI Review)
                            </h3>
                            
                            {selectedCompany && (
                                <button 
                                    onClick={() => setSelectedCompany(null)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    <Filter size={14} /> Showing: {selectedCompany} (Clear)
                                </button>
                            )}
                        </div>
                        
                        {isLoading ? (
                            <div style={{ textAlign: 'center', marginTop: '30px', color: '#6b7280' }}>
                                <Activity size={30} className="spinner" style={{ animation: 'spin 2s linear infinite' }} />
                                <p>Loading Critical Alerts...</p>
                            </div>
                        ) : displayedAlerts.length > 0 ? (
                            <div className="alerts-grid" style={{ marginTop: '16px' }}>
                                {displayedAlerts.map((alert) => (
                                    <div className="alert-card high" key={alert.id}>
                                        <div className="alert-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div className="alert-title">
                                                <ShieldAlert size={20} className="text-red" />
                                                <h4>{alert.device}</h4>
                                            </div>
                                            
                                            <button 
                                                className="btn-ai"
                                                onClick={() => handleAskGemini(alert)}
                                                disabled={loadingDeviceId === alert.id}
                                            >
                                                {loadingDeviceId === alert.id ? (
                                                    <><Loader2 size={14} className="spin-animation" /> Thinking...</>
                                                ) : (
                                                    <><Cpu size={14} /> Ask AI</>
                                                )}
                                            </button>
                                        </div>
                                        <div className="alert-issue" style={{marginTop: '12px'}}>{alert.issue}</div>
                                        <div className="prediction-metrics" style={{marginTop: '12px', fontSize: '0.9rem', color: '#4b5563'}}>
                                            <p><strong>Failure Probability:</strong> {alert.probability}%</p>
                                            <p><strong>Status:</strong> <span style={{color: '#ef4444', fontWeight: 'bold'}}>{alert.statusText}</span></p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', backgroundColor: '#f0fdf4', borderRadius: '12px', marginTop: '16px', border: '1px solid #bbf7d0' }}>
                                <CheckCircle2 size={40} color="#16a34a" style={{ marginBottom: '10px' }} />
                                <p style={{ color: '#15803d', fontSize: '1.1rem', fontWeight: '500' }}>
                                    {selectedCompany 
                                        ? `Great! No critical risks detected for ${selectedCompany}.` 
                                        : 'Great! No critical risks detected across your devices.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* AI Insight Modal */}
            {aiModal.isOpen && (
                <div className="ai-modal-overlay">
                    <div className="ai-modal-content">
                        <div className="ai-modal-header">
                            <div className="ai-modal-title">
                                <Bot size={24} color="#8b5cf6" />
                                Gemini AI Insight
                            </div>
                            <button className="close-btn" onClick={() => setAiModal({ ...aiModal, isOpen: false })}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="ai-modal-body">
                            <p style={{ color: '#4b5563', marginBottom: '16px', fontSize: '0.95rem' }}>
                                Analysis for: <strong>{aiModal.device}</strong>
                            </p>
                            <div className="ai-advice-box" style={{ background: '#f3e8ff', borderLeft: '4px solid #8b5cf6', padding: '16px', borderRadius: '4px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <Cpu size={28} color="#7c3aed" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div style={{ color: '#4c1d95', lineHeight: '1.6' }}>{aiModal.advice}</div>
                            </div>
                        </div>
                        <div className="ai-modal-footer">
                            <button 
                                onClick={() => setAiModal({ ...aiModal, isOpen: false })}
                                style={{ background: '#f3f4f6', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#374151' }}
                            >
                                Acknowledge
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
                        <button className="toast-close" onClick={() => setNotification(null)}>
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RiskMonitor;