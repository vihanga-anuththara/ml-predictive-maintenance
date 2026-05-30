import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, X, Eye, EyeOff } from 'lucide-react';
import './Login.css';

function Login() {
    const [isLoading, setIsLoading] = useState(false);
    
    // Sign In State
    const [username, setUsername] = useState(''); 
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); // Show/Hide password state
    
    const navigate = useNavigate();

    // Toast Notification State
    const [notification, setNotification] = useState(null);

    const showToast = (type, title, message) => {
        setNotification({ type, title, message });
        setTimeout(() => {
            setNotification(null);
        }, 4000);
    };

    // JWT Login Function
    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await axios.post('http://127.0.0.1:8000/api/login/', {
                username: username, 
                password: password
            });
            
            // Save JWT tokens
            localStorage.setItem('accessToken', response.data.access);
            localStorage.setItem('refreshToken', response.data.refresh);

            // Save username on local storage
            localStorage.setItem('username', response.data.username || username); 

            const userRole = response.data.role || 'Technician';
            localStorage.setItem('userRole', userRole);
            
            navigate('/dashboard'); 

        } catch (error) {
            console.error("Login Error:", error);
            
            // Check if the user is blocked or invalid credentials
            if (error.response && error.response.status === 401) {
                showToast('error', 'Authentication Failed', 'Invalid credentials or your account is blocked.');
            } else {
                showToast('error', 'Connection Error', 'Server error! Could not connect to the backend.');
            }
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
                                {isLoading ? 'Signing In...' : 'Sign in'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

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