import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone, Eye, EyeOff, Sparkles, ArrowLeft } from 'lucide-react';

import { API_URL } from '../config';

const AuthModal = ({ isOpen, onClose, onLogin }) => {
    const [view, setView] = useState('login');
    // 'login' | 'register-info' | 'register-otp' | 'register-final' | 'forgot-email' | 'forgot-otp' | 'forgot-newpass'
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Login
    const [loginId, setLoginId] = useState('');
    const [loginPass, setLoginPass] = useState('');

    // Register Step 1: info
    const [regName, setRegName] = useState('');
    const [regUsername, setRegUsername] = useState('');
    const [regEmail, setRegEmail] = useState('');

    // Register Step 2: OTP
    const [regOtp, setRegOtp] = useState('');
    const [pendingUserId, setPendingUserId] = useState(null);
    const [emailVerified, setEmailVerified] = useState(false);

    // Register Step 3: final
    const [regPhone, setRegPhone] = useState('');
    const [regPassword, setRegPassword] = useState('');

    // Forgot password
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotOtp, setForgotOtp] = useState('');
    const [forgotUserId, setForgotUserId] = useState(null);
    const [newPassword, setNewPassword] = useState('');

    const clearAll = () => {
        setError(''); setSuccess(''); setShowPassword(false);
        setLoginId(''); setLoginPass('');
        setRegName(''); setRegUsername(''); setRegEmail(''); setRegOtp(''); setRegPhone(''); setRegPassword('');
        setPendingUserId(null); setEmailVerified(false);
        setForgotEmail(''); setForgotOtp(''); setForgotUserId(null); setNewPassword('');
    };

    const switchView = (v) => { clearAll(); setView(v); };

    // ======= LOGIN =======
    const handleLogin = async (e) => {
        e.preventDefault(); setError(''); setLoading(true);
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: loginId, password: loginPass }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onLogin(data.user); onClose();
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    // ======= REGISTER Step 1: Send OTP =======
    const handleSendOtp = async () => {
        if (!regName.trim() || !regUsername.trim() || !regEmail.trim()) {
            setError('Please fill Name, Username, and Email'); return;
        }
        setError(''); setLoading(true);
        try {
            const res = await fetch(`${API_URL}/send-otp`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: regName, username: regUsername, email: regEmail }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPendingUserId(data.userId);
            setView('register-otp');
            setSuccess('OTP sent to your email!');
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    // ======= REGISTER Step 2: Verify OTP =======
    const handleVerifyRegOtp = async () => {
        setError(''); setLoading(true);
        try {
            const res = await fetch(`${API_URL}/verify-email`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: pendingUserId, otp: regOtp }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setEmailVerified(true);
            setView('register-final');
            setSuccess('Email verified! Set your phone & password.');
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    // ======= REGISTER Step 3: Complete =======
    const handleCompleteRegistration = async (e) => {
        e.preventDefault();
        if (regPhone.length !== 10) { setError('Phone number must be 10 digits'); return; }
        if (regPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
        setError(''); setLoading(true);
        try {
            const res = await fetch(`${API_URL}/complete-registration`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: pendingUserId, phone: regPhone, password: regPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onLogin(data.user); onClose();
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    // ======= FORGOT: Send OTP =======
    const handleForgotSendOtp = async () => {
        if (!forgotEmail.trim()) { setError('Enter your email'); return; }
        setError(''); setLoading(true);
        try {
            const res = await fetch(`${API_URL}/forgot-password`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: forgotEmail }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setForgotUserId(data.userId);
            setView('forgot-otp');
            setSuccess('OTP sent to your email!');
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    // ======= FORGOT: Verify OTP =======
    const handleForgotVerifyOtp = async () => {
        setError(''); setLoading(true);
        try {
            const res = await fetch(`${API_URL}/verify-forgot-otp`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: forgotUserId, otp: forgotOtp }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setView('forgot-newpass');
            setSuccess('OTP verified! Set your new password.');
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    // ======= FORGOT: Reset Password =======
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
        setError(''); setLoading(true);
        try {
            const res = await fetch(`${API_URL}/reset-password`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: forgotUserId, password: newPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSuccess('Password reset! You can now login.');
            setTimeout(() => switchView('login'), 1500);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    if (!isOpen) return null;

    return (
        <div className="auth-overlay" onClick={onClose}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                <button className="auth-close" onClick={onClose}><X size={20} /></button>

                {/* Tab header — only for login/register-info */}
                {(view === 'login' || view === 'register-info') && (
                    <div className="auth-tabs">
                        <button className={`auth-tab ${view === 'login' ? 'active' : ''}`}
                            onClick={() => switchView('login')}>Login</button>
                        <button className={`auth-tab ${view.startsWith('register') ? 'active' : ''}`}
                            onClick={() => switchView('register-info')}>Register</button>
                    </div>
                )}

                {error && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}

                {/* ========= LOGIN ========= */}
                {view === 'login' && (
                    <form className="auth-form" onSubmit={handleLogin}>
                        <div className="auth-input-group">
                            <User size={16} className="auth-input-icon" />
                            <input type="text" placeholder="Email or Username" value={loginId}
                                onChange={(e) => setLoginId(e.target.value)} required />
                        </div>
                        <div className="auth-input-group">
                            <Lock size={16} className="auth-input-icon" />
                            <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={loginPass}
                                onChange={(e) => setLoginPass(e.target.value)} required />
                            <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <button type="submit" className="auth-submit" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                        <button type="button" className="forgot-btn" onClick={() => switchView('forgot-email')}>
                            Forgot Password?
                        </button>
                    </form>
                )}

                {/* ========= REGISTER Step 1: Name + Username + Email + Send OTP ========= */}
                {view === 'register-info' && (
                    <div className="auth-form">
                        <div className="auth-input-group">
                            <User size={16} className="auth-input-icon" />
                            <input type="text" placeholder="Full Name" value={regName}
                                onChange={(e) => setRegName(e.target.value)} />
                        </div>
                        <div className="auth-input-group">
                            <User size={16} className="auth-input-icon" />
                            <input type="text" placeholder="Username" value={regUsername}
                                onChange={(e) => setRegUsername(e.target.value)} />
                        </div>
                        <button type="button" className="use-name-btn" onClick={() => setRegUsername(regName.toLowerCase().replace(/\s+/g, ''))}>
                            ✨ Use name as username
                        </button>
                        <div className="auth-input-group email-otp-row">
                            <Mail size={16} className="auth-input-icon" />
                            <input type="email" placeholder="Email" value={regEmail}
                                onChange={(e) => setRegEmail(e.target.value)} />
                            <button type="button" className="send-otp-btn" onClick={handleSendOtp} disabled={loading}>
                                {loading ? '...' : 'Send OTP'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ========= REGISTER Step 2: Enter & Verify OTP ========= */}
                {view === 'register-otp' && (
                    <div className="auth-form otp-form">
                        <button type="button" className="auth-back" onClick={() => { setView('register-info'); setSuccess(''); }}>
                            <ArrowLeft size={16} /> Back
                        </button>
                        <div className="otp-header">
                            <Sparkles size={32} className="otp-icon" />
                            <h3>Verify Your Email</h3>
                            <p>Enter the 6-digit code sent to <strong>{regEmail}</strong></p>
                        </div>
                        <div className="auth-input-group otp-input-group">
                            <input type="text" placeholder="Enter OTP" maxLength={6} value={regOtp}
                                onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, ''))}
                                className="otp-input" />
                        </div>
                        <button type="button" className="auth-submit" onClick={handleVerifyRegOtp}
                            disabled={loading || regOtp.length !== 6}>
                            {loading ? 'Verifying...' : 'Verify'}
                        </button>
                    </div>
                )}

                {/* ========= REGISTER Step 3: Phone + Password ========= */}
                {view === 'register-final' && (
                    <form className="auth-form" onSubmit={handleCompleteRegistration}>
                        <div className="otp-header" style={{ marginBottom: '8px' }}>
                            <h3>Almost there!</h3>
                            <p>Set your phone number and password to finish.</p>
                        </div>
                        <div className="auth-input-group">
                            <Phone size={16} className="auth-input-icon" />
                            <input type="tel" placeholder="10-digit Phone Number" value={regPhone} maxLength={10}
                                onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ''))} required />
                        </div>
                        <div className="auth-input-group">
                            <Lock size={16} className="auth-input-icon" />
                            <input type={showPassword ? 'text' : 'password'} placeholder="Password (min 6 chars)" value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)} required minLength={6} />
                            <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <button type="submit" className="auth-submit" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Complete Registration'}
                        </button>
                    </form>
                )}

                {/* ========= FORGOT: Enter Email ========= */}
                {view === 'forgot-email' && (
                    <div className="auth-form">
                        <button type="button" className="auth-back" onClick={() => switchView('login')}>
                            <ArrowLeft size={16} /> Back to Login
                        </button>
                        <div className="otp-header">
                            <Lock size={32} className="otp-icon" />
                            <h3>Forgot Password</h3>
                            <p>Enter your registered email to receive a reset OTP.</p>
                        </div>
                        <div className="auth-input-group email-otp-row">
                            <Mail size={16} className="auth-input-icon" />
                            <input type="email" placeholder="Your Email" value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)} />
                            <button type="button" className="send-otp-btn" onClick={handleForgotSendOtp} disabled={loading}>
                                {loading ? '...' : 'Send OTP'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ========= FORGOT: Verify OTP ========= */}
                {view === 'forgot-otp' && (
                    <div className="auth-form otp-form">
                        <button type="button" className="auth-back" onClick={() => { setView('forgot-email'); setSuccess(''); }}>
                            <ArrowLeft size={16} /> Back
                        </button>
                        <div className="otp-header">
                            <Sparkles size={32} className="otp-icon" />
                            <h3>Enter Reset Code</h3>
                            <p>Enter the 6-digit code sent to <strong>{forgotEmail}</strong></p>
                        </div>
                        <div className="auth-input-group otp-input-group">
                            <input type="text" placeholder="Enter OTP" maxLength={6} value={forgotOtp}
                                onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                                className="otp-input" />
                        </div>
                        <button type="button" className="auth-submit" onClick={handleForgotVerifyOtp}
                            disabled={loading || forgotOtp.length !== 6}>
                            {loading ? 'Verifying...' : 'Verify'}
                        </button>
                    </div>
                )}

                {/* ========= FORGOT: New Password ========= */}
                {view === 'forgot-newpass' && (
                    <form className="auth-form" onSubmit={handleResetPassword}>
                        <div className="otp-header" style={{ marginBottom: '8px' }}>
                            <h3>Set New Password</h3>
                            <p>Choose a strong new password for your account.</p>
                        </div>
                        <div className="auth-input-group">
                            <Lock size={16} className="auth-input-icon" />
                            <input type={showPassword ? 'text' : 'password'} placeholder="New Password (min 6 chars)" value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                            <button type="button" className="auth-eye" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <button type="submit" className="auth-submit" disabled={loading}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AuthModal;
