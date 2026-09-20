import React, { useState, useEffect } from 'react';
import { Users, MessageCircle, Clock, Mail, Phone, User, ChevronDown, ChevronUp, Shield, LogOut, RefreshCw, Inbox, CheckCircle, Eye, Trash2, Brain, Plus, Sparkles } from 'lucide-react';

import { API_URL } from '../config';

const AdminPage = () => {
    const [adminEmail, setAdminEmail] = useState(null);
    const [adminToken, setAdminToken] = useState(null);
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [loading, setLoading] = useState(true);
    const [expandedUser, setExpandedUser] = useState(null);
    const [userChats, setUserChats] = useState({});
    const [loadingChats, setLoadingChats] = useState(null);
    const [error, setError] = useState(null);
    const [contactMessages, setContactMessages] = useState([]);
    const [totalContactMessages, setTotalContactMessages] = useState(0);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [expandedSessions, setExpandedSessions] = useState(new Set());

    // Altis Living Memory state
    const [memories, setMemories] = useState([]);
    const [totalMemories, setTotalMemories] = useState(0);
    const [loadingMemories, setLoadingMemories] = useState(false);
    const [newMemoryContent, setNewMemoryContent] = useState('');
    const [newMemoryCategory, setNewMemoryCategory] = useState('general');
    const [showAddMemoryModal, setShowAddMemoryModal] = useState(false);
    const [addingMemory, setAddingMemory] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('loggedInUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.isAdmin) {
                    setAdminEmail(user.email);
                    setAdminToken(user.token);
                } else {
                    setError('Access denied. Admin privileges required.');
                    setLoading(false);
                }
            } catch {
                setError('Invalid session. Please log in again.');
                setLoading(false);
            }
        } else {
            setError('Not logged in. Please log in as admin from the main site.');
            setLoading(false);
        }
    }, []);

    const getAuthHeaders = () => {
        const headers = { 'Content-Type': 'application/json' };
        if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
        if (adminEmail) headers['x-admin-email'] = adminEmail;
        return headers;
    };

    useEffect(() => {
        if (adminEmail) {
            fetchUsers();
            fetchContactMessages();
            fetchMemories();
        }
    }, [adminEmail, adminToken]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/admin/users`, {
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (res.ok) {
                setUsers(data.users);
                setTotalUsers(data.totalUsers);
            } else {
                setError(data.error || 'Failed to fetch users');
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setError('Failed to connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    const fetchContactMessages = async () => {
        setLoadingMessages(true);
        try {
            const res = await fetch(`${API_URL}/admin/contact-messages`, {
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (res.ok) {
                setContactMessages(data.messages);
                setTotalContactMessages(data.totalMessages);
            }
        } catch (err) {
            console.error('Failed to fetch contact messages:', err);
        } finally {
            setLoadingMessages(false);
        }
    };

    const fetchMemories = async () => {
        setLoadingMemories(true);
        try {
            const res = await fetch(`${API_URL}/chat/memories`);
            const data = await res.json();
            if (res.ok && data.memories) {
                setMemories(data.memories);
                setTotalMemories(data.count !== undefined ? data.count : data.memories.length);
            }
        } catch (err) {
            console.error('Failed to fetch memories:', err);
        } finally {
            setLoadingMemories(false);
        }
    };

    const handleAddMemory = async (e) => {
        e.preventDefault();
        if (!newMemoryContent.trim()) return;
        setAddingMemory(true);
        try {
            const res = await fetch(`${API_URL}/chat/memories`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    content: newMemoryContent.trim(),
                    category: newMemoryCategory
                })
            });
            const data = await res.json();
            if (res.ok && data.memory) {
                setMemories(prev => [data.memory, ...prev]);
                setTotalMemories(prev => prev + 1);
                setNewMemoryContent('');
                setShowAddMemoryModal(false);
            } else {
                alert(data.error || 'Failed to save memory');
            }
        } catch (err) {
            console.error('Failed to add memory:', err);
            alert('Failed to connect to the server.');
        } finally {
            setAddingMemory(false);
        }
    };

    const handleDeleteMemory = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to deactivate this living memory from Altis's neural bank?")) return;
        try {
            const res = await fetch(`${API_URL}/chat/memories/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (res.ok) {
                setMemories(prev => prev.filter(m => m._id !== id));
                setTotalMemories(prev => Math.max(0, prev - 1));
            }
        } catch (err) {
            console.error('Failed to delete memory:', err);
        }
    };

    const markAsRead = async (msgId) => {
        try {
            const res = await fetch(`${API_URL}/admin/contact-messages/${msgId}/read`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                setContactMessages(prev =>
                    prev.map(m => m._id === msgId ? { ...m, read: true } : m)
                );
            }
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    const fetchUserChats = async (userId) => {
        if (expandedUser === userId) {
            setExpandedUser(null);
            return;
        }
        if (userChats[userId]) {
            setExpandedUser(userId);
            return;
        }
        setLoadingChats(userId);
        try {
            const res = await fetch(`${API_URL}/admin/users/${userId}/chats`, {
                headers: getAuthHeaders(),
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

    const toggleSession = (sessionId) => {
        setExpandedSessions(prev => {
            const next = new Set(prev);
            if (next.has(sessionId)) {
                next.delete(sessionId);
            } else {
                next.add(sessionId);
            }
            return next;
        });
    };

    const deleteChatSession = async (userId, chatId, e) => {
        e.stopPropagation(); // Prevent toggling accordion
        if (!window.confirm('Are you sure you want to permanently delete this chat session?')) return;
        try {
            const res = await fetch(`${API_URL}/admin/users/${userId}/chats/${chatId}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                setUserChats(prev => {
                    const newChats = { ...prev };
                    newChats[userId] = newChats[userId].filter(c => c._id !== chatId);
                    return newChats;
                });
                // Update total chat/message count for the user in the parent list
                setUsers(prev => prev.map(u => {
                    if (u._id === userId) {
                        const remainingChats = userChats[userId].filter(c => c._id !== chatId);
                        const newMsgCount = remainingChats.reduce((sum, log) => sum + log.messages.length, 0);
                        return { ...u, totalChats: remainingChats.length, totalMessages: newMsgCount };
                    }
                    return u;
                }));
            }
        } catch (err) {
            console.error('Failed to delete chat session:', err);
        }
    };

    const deleteContactMessage = async (msgId, e) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to permanently delete this contact message?')) return;
        try {
            const res = await fetch(`${API_URL}/admin/contact-messages/${msgId}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                setContactMessages(prev => prev.filter(m => m._id !== msgId));
                setTotalContactMessages(prev => prev - 1);
            }
        } catch (err) {
            console.error('Failed to delete contact message:', err);
        }
    };

    const unreadCount = contactMessages.filter(m => !m.read).length;

    if (error) {
        return (
            <div className="admin-page">
                <div className="admin-error-screen">
                    <Shield size={48} />
                    <h2>Access Denied</h2>
                    <p>{error}</p>
                    <button onClick={() => window.close()} className="admin-btn-primary">Close Window</button>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <header className="admin-topbar">
                <div className="admin-topbar-left">
                    <Shield size={22} />
                    <h1>Admin Dashboard</h1>
                </div>
                <div className="admin-topbar-right">
                    <button onClick={() => { fetchUsers(); fetchContactMessages(); fetchMemories(); }} className="admin-btn-icon" title="Refresh All">
                        <RefreshCw size={18} className={loading || loadingMessages || loadingMemories ? 'spin' : ''} />
                    </button>
                    <span className="admin-email">{adminEmail}</span>
                    <button onClick={() => window.close()} className="admin-btn-icon" title="Close">
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="admin-tabs">
                <button
                    className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <Users size={16} />
                    Users
                    <span className="tab-count">{totalUsers}</span>
                </button>
                <button
                    className={`admin-tab ${activeTab === 'messages' ? 'active' : ''}`}
                    onClick={() => setActiveTab('messages')}
                >
                    <Inbox size={16} />
                    Contact Messages
                    {unreadCount > 0 && <span className="tab-count unread">{unreadCount}</span>}
                    {unreadCount === 0 && <span className="tab-count">{totalContactMessages}</span>}
                </button>
                <button
                    className={`admin-tab ${activeTab === 'memories' ? 'active' : ''}`}
                    onClick={() => setActiveTab('memories')}
                >
                    <Brain size={16} />
                    Altis Living Memory
                    <span className="tab-count memory-count">{totalMemories}</span>
                </button>
            </div>

            <main className="admin-main">
                {/* ========== USERS TAB ========== */}
                {activeTab === 'users' && (
                    <>
                        {loading ? (
                            <div className="admin-loading-screen">
                                <div className="admin-spinner"></div>
                                <p>Loading users...</p>
                            </div>
                        ) : users.length === 0 ? (
                            <div className="admin-empty-state">
                                <Users size={48} />
                                <h3>No registered users yet</h3>
                                <p>Users will appear here once they register on the portfolio.</p>
                            </div>
                        ) : (
                            <div className="admin-users-grid">
                                {users.map((user) => (
                                    <div key={user._id} className={`admin-user-card ${expandedUser === user._id ? 'expanded' : ''}`}>
                                        <div className="user-card-header" onClick={() => fetchUserChats(user._id)}>
                                            <div className="user-card-avatar">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="user-card-info">
                                                <h3>{user.name}</h3>
                                                <span className="user-card-username">@{user.username}</span>
                                            </div>
                                            <div className="user-card-stats">
                                                <div className="user-stat">
                                                    <MessageCircle size={14} />
                                                    <span>{user.totalChats} chats</span>
                                                </div>
                                                <div className="user-stat">
                                                    <Clock size={14} />
                                                    <span>{user.totalMessages} msgs</span>
                                                </div>
                                            </div>
                                            <button className="user-card-toggle">
                                                {loadingChats === user._id ? (
                                                    <RefreshCw size={18} className="spin" />
                                                ) : expandedUser === user._id ? (
                                                    <ChevronUp size={18} />
                                                ) : (
                                                    <ChevronDown size={18} />
                                                )}
                                            </button>
                                        </div>

                                        <div className="user-card-details">
                                            <div className="detail-item"><Mail size={14} /> <span>{user.email}</span></div>
                                            <div className="detail-item"><Phone size={14} /> <span>{user.phone || 'N/A'}</span></div>
                                            <div className="detail-item"><Clock size={14} /> <span>Joined: {formatDate(user.createdAt)}</span></div>
                                            <div className="detail-item"><User size={14} /> <span>Last Login: {formatDate(user.lastLogin)}</span></div>
                                            {user.lastChat && (
                                                <div className="detail-item"><MessageCircle size={14} /> <span>Last Chat: {formatDate(user.lastChat)}</span></div>
                                            )}
                                        </div>

                                        {expandedUser === user._id && (
                                            <div className="user-card-chats">
                                                {loadingChats === user._id ? (
                                                    <div className="chats-loading">
                                                        <div className="admin-spinner small"></div>
                                                        Loading conversations...
                                                    </div>
                                                ) : !userChats[user._id] || userChats[user._id].length === 0 ? (
                                                    <div className="chats-empty">No conversations yet.</div>
                                                ) : (
                                                    userChats[user._id].map((chatLog, idx) => (
                                                        <div key={chatLog._id} className={`chat-session-block ${expandedSessions.has(chatLog._id) ? 'session-open' : ''}`}>
                                                            <div className="chat-session-title" onClick={() => toggleSession(chatLog._id)} style={{ cursor: 'pointer' }}>
                                                                <span className="session-label">
                                                                    {expandedSessions.has(chatLog._id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                                    Session {userChats[user._id].length - idx} — {formatDate(chatLog.sessionStart || chatLog.createdAt)}
                                                                </span>
                                                                <span className="session-msg-count">
                                                                    {chatLog.messages.length} messages
                                                                    <button className="delete-btn-icon" onClick={(e) => deleteChatSession(user._id, chatLog._id, e)} title="Delete session">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </span>
                                                            </div>
                                                            {expandedSessions.has(chatLog._id) && (
                                                                <div className="chat-session-msgs">
                                                                    {chatLog.messages.map((msg, mIdx) => (
                                                                        <div key={mIdx} className={`chat-msg ${msg.role}`}>
                                                                            <div className="chat-msg-role">
                                                                                {msg.role === 'user' ? '👤' : '🤖'}
                                                                            </div>
                                                                            <div className="chat-msg-content">
                                                                                {msg.content}
                                                                                {msg.model && <div className="chat-msg-model">[Model: {msg.model}]</div>}
                                                                            </div>
                                                                            <span className="chat-msg-time">
                                                                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ========== CONTACT MESSAGES TAB ========== */}
                {activeTab === 'messages' && (
                    <>
                        {loadingMessages ? (
                            <div className="admin-loading-screen">
                                <div className="admin-spinner"></div>
                                <p>Loading messages...</p>
                            </div>
                        ) : contactMessages.length === 0 ? (
                            <div className="admin-empty-state">
                                <Inbox size={48} />
                                <h3>No contact messages yet</h3>
                                <p>Messages from the contact form will appear here.</p>
                            </div>
                        ) : (
                            <div className="admin-messages-list">
                                {contactMessages.map((msg) => (
                                    <div key={msg._id} className={`contact-msg-card ${msg.read ? 'read' : 'unread'}`}>
                                        <div className="contact-msg-header">
                                            <div className="contact-msg-sender">
                                                <div className="contact-msg-avatar">{msg.name.charAt(0).toUpperCase()}</div>
                                                <div>
                                                    <h4>{msg.name}</h4>
                                                    <span className="contact-msg-email">{msg.email}</span>
                                                </div>
                                            </div>
                                            <div className="contact-msg-meta">
                                                <span className="contact-msg-date">{formatDate(msg.createdAt)}</span>
                                                {!msg.read && (
                                                    <button
                                                        className="mark-read-btn"
                                                        onClick={() => markAsRead(msg._id)}
                                                        title="Mark as read"
                                                    >
                                                        <CheckCircle size={16} />
                                                        Mark Read
                                                    </button>
                                                )}
                                                {msg.read && (
                                                    <span className="read-badge"><Eye size={12} /> Read</span>
                                                )}
                                                <button
                                                    className="delete-btn-icon"
                                                    onClick={(e) => deleteContactMessage(msg._id, e)}
                                                    title="Delete message"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="contact-msg-body">
                                            {msg.message}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ========== ALTIS LIVING MEMORY TAB ========== */}
                {activeTab === 'memories' && (
                    <div className="admin-memories-section">
                        <div className="memories-banner">
                            <div className="memories-banner-info">
                                <div className="memories-banner-badge">
                                    <Brain size={16} />
                                    <span>LIVING KNOWLEDGE BASE</span>
                                </div>
                                <h3>Altis Neural Memory Bank</h3>
                                <p>
                                    Permanent memory remembered directly from creator <strong>Shahriyar Taufik</strong> (Admin).
                                    Whenever you tell Altis facts or updates in chat (or add them manually here), Altis permanently commits them to MongoDB and references them when talking to <strong>guests, visitors, recruiters, and yourself</strong>.
                                </p>
                            </div>
                            <button
                                className="admin-btn-primary add-memory-trigger-btn"
                                onClick={() => setShowAddMemoryModal(true)}
                            >
                                <Plus size={16} /> Add Memory Manually
                            </button>
                        </div>

                        {loadingMemories ? (
                            <div className="admin-loading-screen">
                                <div className="admin-spinner"></div>
                                <p>Loading neural memories...</p>
                            </div>
                        ) : memories.length === 0 ? (
                            <div className="admin-empty-state">
                                <Brain size={48} />
                                <h3>No living memories stored yet</h3>
                                <p>Chat with Altis as Shahriyar ("Altis, remember that...", "Update: I am working on...") or click "Add Memory Manually" above.</p>
                            </div>
                        ) : (
                            <div className="admin-memories-grid">
                                {memories.map((mem) => (
                                    <div key={mem._id} className="admin-memory-card">
                                        <div className="memory-card-header">
                                            <span className={`memory-category-tag cat-${(mem.category || 'general').toLowerCase()}`}>
                                                {(mem.category || 'general').toUpperCase()}
                                            </span>
                                            <div className="memory-meta-right">
                                                <span className="memory-source-pill" title="Source of fact">
                                                    {mem.source === 'creator_directive' ? '⚡ Shahriyar Chat' : '🛠️ Admin Panel'}
                                                </span>
                                                <button
                                                    className="delete-btn-icon"
                                                    onClick={(e) => handleDeleteMemory(mem._id, e)}
                                                    title="Deactivate memory"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="memory-card-content">
                                            <p className="memory-text">"{mem.content}"</p>
                                        </div>

                                        <div className="memory-card-footer">
                                            <div className="memory-author-info">
                                                <span className="memory-author-name">{mem.authorName || 'Shahriyar Taufik'}</span>
                                                <span className="memory-date">{formatDate(mem.createdAt)}</span>
                                            </div>
                                            <div className="memory-stats">
                                                <span className="memory-access-count" title="Times accessed in conversation context">
                                                    ⚡ Used {mem.accessCount || 1}×
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add Memory Modal */}
                        {showAddMemoryModal && (
                            <div className="modal-backdrop" onClick={() => setShowAddMemoryModal(false)}>
                                <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
                                    <div className="modal-card-header">
                                        <div className="modal-title-with-icon">
                                            <Brain size={20} className="modal-title-icon" />
                                            <h3>Add Knowledge to Altis</h3>
                                        </div>
                                        <button className="modal-close-btn" onClick={() => setShowAddMemoryModal(false)}>
                                            &times;
                                        </button>
                                    </div>
                                    <form onSubmit={handleAddMemory} className="modal-form">
                                        <div className="form-group">
                                            <label>Category</label>
                                            <select
                                                value={newMemoryCategory}
                                                onChange={e => setNewMemoryCategory(e.target.value)}
                                                className="modal-select"
                                            >
                                                <option value="general">General Knowledge</option>
                                                <option value="career">Career / Job Availability</option>
                                                <option value="project">Active Projects / Tech Stack</option>
                                                <option value="directive">Visitor Handling Directives</option>
                                                <option value="personal">Personal / Bio</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Fact / Knowledge / Directive</label>
                                            <textarea
                                                value={newMemoryContent}
                                                onChange={e => setNewMemoryContent(e.target.value)}
                                                placeholder="e.g. Shahriyar is now open to full-time AI Engineering roles in Bangalore or remote."
                                                rows={4}
                                                required
                                                className="modal-textarea"
                                            />
                                        </div>
                                        <p className="modal-hint">
                                            ✨ This fact will be permanently stored in Altis's database and prioritized in conversations with all visitors, guests, and Shahriyar.
                                        </p>
                                        <div className="modal-actions">
                                            <button
                                                type="button"
                                                onClick={() => setShowAddMemoryModal(false)}
                                                className="admin-btn-secondary"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={addingMemory || !newMemoryContent.trim()}
                                                className="admin-btn-primary"
                                            >
                                                {addingMemory ? 'Saving...' : 'Commit to Altis Memory'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminPage;
