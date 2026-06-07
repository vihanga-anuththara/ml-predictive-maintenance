import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, X, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';
import './Login.css';

function Login() {
    const [isLoading, setIsLoading] = useState(false);
    
    // Sign In State
    const [username, setUsername] = useState(''); 
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    // 2FA (OTP) States
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [loginEmail, setLoginEmail] = useState('');
    
    // Recovery Mode State
    const [isRecoveryMode, setIsRecoveryMode] = useState(false);

    const navigate = useNavigate();
    const [notification, setNotification] = useState(null);

    const showToast = (type, title, message) => {
        setNotification({ type, title, message });
        setTimeout(() => setNotification(null), 4000);
    };

    // Login using Username and Password
    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await axios.post('http://127.0.0.1:8000/api/login/', {
                username: username, 
                password: password
            });
            
            // If 2FA enabled, request OTP
            if (response.data.message === 'OTP_REQUIRED') {
                setLoginEmail(response.data.email);
                setShowOtpModal(true);
                setIsRecoveryMode(false); // Reset to default OTP mode
                setOtpCode('');
                showToast('success', '2FA Required', 'Please enter your authenticator code.');
                setIsLoading(false);
                return;
            }

            // Redirect to Dashboard
            localStorage.setItem('accessToken', response.data.access);
            localStorage.setItem('refreshToken', response.data.refresh);
            localStorage.setItem('username', response.data.name || username); 
            localStorage.setItem('userRole', response.data.role || 'Technician');
            
            navigate('/dashboard'); 

        } catch (error) {
            console.error("Login Error:", error);
            if (error.response && error.response.status === 401) {
                showToast('error', 'Authentication Failed', 'Invalid credentials or your account is blocked.');
            } else {
                showToast('error', 'Connection Error', 'Server error! Could not connect to the backend.');
            }
            setIsLoading(false);
        }
    };

    // Login using OTP or Recovery Code
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await axios.post('http://127.0.0.1:8000/api/login-verify-otp/', {
                email: loginEmail,
                code: otpCode.trim() // Remove Spaces 
            });

            // Redirect to Dashboard
            localStorage.setItem('accessToken', response.data.access);
            localStorage.setItem('refreshToken', response.data.refresh);
            localStorage.setItem('username', response.data.name || username); 
            localStorage.setItem('userRole', response.data.role || 'Technician');
            
            setShowOtpModal(false);
            
            // If logged using recovery code, display a message.
            if (isRecoveryMode) {
                setTimeout(() => {
                    alert("You logged in using a Recovery Code. Please go to Settings and reset your 2FA to secure your account.");
                }, 1000);
            }

            navigate('/dashboard'); 

        } catch (error) {
            console.error("OTP Error:", error);
            showToast('error', 'Verification Failed', isRecoveryMode ? 'Invalid recovery code.' : 'Invalid 2FA code.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-root">
            {/* LEFT - BRAND PANE */}
            <div className="brand-panel">
                <div className="grid-overlay" aria-hidden="true" />
                <div className="brand-content">
                    <h1 className="brand-headline">
                        Predict<br />
                        <span className="accent-text">Failures</span><br />
                        Before They<br />
                        Happen.
                    </h1>
                    <p className="brand-sub">
                        ML-powered hardware monitoring for corporate endpoints.
                        Real-time risk classification across your entire device fleet.
                    </p>
                    <div className="stat-row">
                        <div className="stat-item">
                            <span className="stat-number">99.8<span className="stat-unit">%</span></span>
                            <span className="stat-label">Detection rate</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT - FORM PANEL */}
            <div className="form-panel">
                <div className="form-inner">
                    <div className="form-animate">
                        <form onSubmit={handleLogin} className="auth-form">
                            <div className="form-heading-block">
                                <h2 className="form-heading">Welcome back</h2>
                                <p className="form-hint">Sign in to your monitoring dashboard</p>
                            </div>

                            <div className="field" style={{ marginTop: '20px' }}>
                                <label className="field-label" htmlFor="username">Work Email or Username</label>
                                <input
                                    id="username"
                                    className="field-input"
                                    type="text"
                                    placeholder="e.g. admin"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="field">
                                <div className="field-label-row">
                                    <label className="field-label" htmlFor="password">Password</label>
                                </div>
                                <div className="password-wrapper">
                                    <input
                                        id="password"
                                        className="field-input"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button 
                                        type="button" 
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label="Toggle password visibility"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '10px' }}>
                                {isLoading && !showOtpModal ? 'Signing In...' : 'Sign in'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* 2FA & Recovery Modal */}
            {showOtpModal && (
                <div className="login-modal-overlay">
                    <div className="login-modal-content">
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                            <div style={{ background: isRecoveryMode ? '#fef3c7' : '#eff6ff', padding: '16px', borderRadius: '50%', transition: 'all 0.3s' }}>
                                {isRecoveryMode ? <KeyRound size={36} color="#d97706" /> : <ShieldCheck size={36} color="#3b82f6" />}
                            </div>
                        </div>
                        
                        <h3 style={{ marginBottom: '8px', fontSize: '1.25rem', color: '#111827', textAlign: 'center' }}>
                            {isRecoveryMode ? 'Recovery Mode' : 'Two-Factor Authentication'}
                        </h3>
                        
                        <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
                            {isRecoveryMode 
                                ? 'Enter your emergency recovery code to regain access.' 
                                : 'Enter the 6-digit code from your authenticator app.'}
                        </p>
                        
                        <form onSubmit={handleVerifyOtp}>
                            {isRecoveryMode ? (
                                <input 
                                    type="text"
                                    className="login-recovery-input"
                                    placeholder="Enter your long recovery code"
                                    required
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)} 
                                />
                            ) : (
                                <input 
                                    type="text"
                                    className="login-otp-input"
                                    placeholder="000000"
                                    maxLength="6"
                                    required
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} // Only numbers
                                />
                            )}
                            
                            {/* Switch Mode Button */}
                            <div style={{ textAlign: 'center', marginTop: '16px' }}>
                                <button 
                                    type="button" 
                                    className="recovery-toggle-btn"
                                    onClick={() => {
                                        setIsRecoveryMode(!isRecoveryMode);
                                        setOtpCode('');
                                    }}
                                >
                                    {isRecoveryMode ? "Back to Authenticator app" : "Lost access to your app?"}
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button 
                                    type="button" 
                                    className="btn-cancel" 
                                    style={{ flex: 1 }}
                                    onClick={() => {
                                        setShowOtpModal(false);
                                        setOtpCode('');
                                        setIsRecoveryMode(false);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-primary" 
                                    style={{ flex: 1, marginTop: 0 }}
                                    disabled={isLoading || (isRecoveryMode ? otpCode.length < 10 : otpCode.length < 6)}
                                >
                                    {isLoading ? 'Verifying...' : 'Verify'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast Notification Container */}
            {notification && (
                <div className="login-toast-container">
                    <div className={`login-toast-message ${notification.type}`}>
                        <div className="login-toast-icon">
                            {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                        </div>
                        <div className="login-toast-content">
                            <div className="login-toast-title">{notification.title}</div>
                            <div className="login-toast-desc">{notification.message}</div>
                        </div>
                        <button className="login-toast-close" onClick={() => setNotification(null)}>
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Login;