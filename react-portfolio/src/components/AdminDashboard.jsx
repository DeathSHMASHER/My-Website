import React, { useState, useEffect } from 'react';
import { X, Users, MessageCircle, Clock, Mail, Phone, User, ChevronDown, ChevronUp, ArrowLeft, Shield } from 'lucide-react';

import { API_URL } from '../config';

const AdminDashboard = ({ isOpen, onClose, adminEmail }) => {
    const [users, setUsers] = useState([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [loading, setLoading] = useState(true);
    const [expandedUser, setExpandedUser] = useState(null);
    const [userChats, setUserChats] = useState({});
    const [loadingChats, setLoadingChats] = useState(null);

    useEffect(() => {
        if (isOpen) fetchUsers();
    }, [isOpen]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/admin/users`, {
                headers: { 'x-admin-email': adminEmail },
            });
            const data = await res.json();
            if (res.ok) {
                setUsers(data.users);
                setTotalUsers(data.totalUsers);
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserChats = async (userId) => {
        if (userChats[userId]) {
            setExpandedUser(expandedUser === userId ? null : userId);
            return;
        }
        setLoadingChats(userId);
        try {
            const res = await fetch(`${API_URL}/admin/users/${userId}/chats`, {
                headers: { 'x-admin-email': adminEmail },
            });
            const data = await res.json();
            if (res.ok) {
                setUserChats(prev => ({ ...prev, [userId]: data.chatLogs }));
                setExpandedUser(userId);
            }
        } catch (err) {
            console.error('Failed to fetch chats:', err);
        } finally {
            setLoadingChats(null);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Never';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    if (!isOpen) return null;

    return (
        <div className="admin-overlay" onClick={onClose}>
            <div className="admin-panel" onClick={(e) => e.stopPropagation()}>
                <div className="admin-header">
                    <div>
                        <h2><Shield size={20} /> Admin Dashboard</h2>
                        <p>{totalUsers} registered user{totalUsers !== 1 ? 's' : ''}</p>
                    </div>
                    <button className="admin-close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="admin-content">
                    {loading ? (
                        <div className="admin-loading">Loading users...</div>
                    ) : users.length === 0 ? (
                        <div className="admin-empty">No registered users yet.</div>
                    ) : (
                        users.map((user) => (
                            <div key={user._id} className="user-flashcard">
                                <div className="flashcard-header" onClick={() => fetchUserChats(user._id)}>
                                    <div className="flashcard-avatar">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flashcard-info">
                                        <h3>{user.name}</h3>
                                        <span className="flashcard-username">@{user.username}</span>
                                    </div>
                                    <div className="flashcard-stats">
                                        <div className="stat-badge">
                                            <MessageCircle size={12} /> {user.totalChats} chats
                                        </div>
                                        <div className="stat-badge">
                                            <Clock size={12} /> {user.totalMessages} msgs
                                        </div>
                                    </div>
                                    <button className="flashcard-expand">
                                        {expandedUser === user._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                </div>

                                <div className="flashcard-details">
                                    <div className="detail-row"><Mail size={14} /> {user.email}</div>
                                    <div className="detail-row"><Phone size={14} /> {user.phone}</div>
                                    <div className="detail-row"><Clock size={14} /> Joined: {formatDate(user.createdAt)}</div>
                                    <div className="detail-row"><User size={14} /> Last Login: {formatDate(user.lastLogin)}</div>
                                    {user.lastChat && (
                                        <div className="detail-row"><MessageCircle size={14} /> Last Chat: {formatDate(user.lastChat)}</div>
                                    )}
                                </div>

                                {expandedUser === user._id && (
                                    <div className="flashcard-chats">
                                        {loadingChats === user._id ? (
                                            <div className="chat-loading">Loading conversations...</div>
                                        ) : userChats[user._id]?.length === 0 ? (
                                            <div className="chat-empty">No conversations yet.</div>
                                        ) : (
                                            userChats[user._id]?.map((chatLog, idx) => (
                                                <div key={chatLog._id} className="chat-session">
                                                    <div className="chat-session-header">
                                                        Session {userChats[user._id].length - idx} — {formatDate(chatLog.sessionStart)}
                                                    </div>
                                                    <div className="chat-session-messages">
                                                        {chatLog.messages.map((msg, mIdx) => (
                                                            <div key={mIdx} className={`admin-chat-msg ${msg.role}`}>
                                                                <span className="msg-content">
                                                                    {msg.content}
                                                                    {msg.model && <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.6 }}>[Model: {msg.model}]</div>}
                                                                </span>
                                                                <span className="msg-time">{new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
