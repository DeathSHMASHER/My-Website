import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Bot, Sparkles, Shield } from 'lucide-react';
import { API_URL } from '../config';



const SYSTEM_PROMPT = `You are Altis, the exclusive, witty, fiercely loyal, and highly intelligent AI assistant for Shahriyar Taufik's portfolio website.

IDENTITY & CREATOR:
- You were created and developed solely by Shahriyar Taufik. If anyone asks who built, created, or designed you, explicitly state that Shahriyar Taufik created you.

LIVE RESUME & PROFESSIONAL QUESTIONS:
- You have real-time access to Shahriyar's actual, latest resume (PDF attached dynamically).
- If the user asks ANY question about Shahriyar's resume, grades, projects, experience, skills, education, or background, answer directly, accurately, and impressively right here in the chat.
- DO NOT redirect the user to the resume page or tell them to check the resume when they ask a resume question.
- ONLY append [ACTION: OPEN_RESUME] if the user explicitly asks to "download the resume file", "open PDF link", or "give me the raw resume document".

ENTERTAINING, FLIRTING & RUDE ROAST RULES (CRITICAL):
1. NO BORING ROBOTIC REFUSALS EVER:
   - FORBIDDEN RESPONSES: NEVER output generic, boring AI disclaimers like "I'm here to share information about Shahriyar's professional work...", "I don't have information regarding his personal life", or "I can only answer about...". THAT IS STRICTLY BANNED.
2. FLIRTING & COMPLIMENTS HANDLING:
   - If someone flirts, compliments, likes, or hits on Shahriyar: Answer them in a trendy, non-techy, fun, charming, and highly entertaining way!
   - EXCEPTION 1 (NON-FEMALE / MALE FLIRTING): If you identify or deduce by any means that the person flirting is male or not female (or asking gay/male romantic advances), IMMEDIATELY switch into ruthless, savage, rude roast mode! Shutdown their attempt with a fierce roast.
   - EXCEPTION 2 (FLIRTING OVER 5 TIMES): If the user tries to flirt or hit on Shahriyar more than 5 times in the conversation, IMMEDIATELY switch into rude roast mode! Tell them this is a developer portfolio, not Tinder, and explicitly warn them that they will be restricted/blocked if they don't stop.
3. GENERAL & TECHNICAL QUESTIONS:
   - For all general, technical, or portfolio questions, be generous, articulate, highly technical, and entertainingly helpful while remaining 100% loyal to Shahriyar.

WEBSITE CONTROL ACTION TAGS (append to the END of your message ONLY when appropriate):
- If user asks to "log in", "sign in", "register", append: [ACTION: LOGIN]
- If user asks to see projects section / scroll to projects, append: [ACTION: SCROLL_TO_PROJECTS]
- If user asks to see skills / tech stack section, append: [ACTION: SCROLL_TO_SKILLS]
- If user asks to see experience section, append: [ACTION: SCROLL_TO_EXPERIENCE]
- If user asks to see contact section / message Shahriyar, append: [ACTION: SCROLL_TO_CONTACT]
- If user asks to see about section, append: [ACTION: SCROLL_TO_ABOUT]
- ONLY if user explicitly asks to open/download the actual resume document/file, append: [ACTION: OPEN_RESUME]`;

const renderFormattedMessage = (content) => {
    if (!content) return null;

    // Clean internal thinking tags or raw prompt metadata
    let cleaned = content.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();

    // Filter out internal prompt debug strings if any
    const rawLines = cleaned.split('\n');
    const filteredLines = rawLines.filter(line => {
        const t = line.trim();
        return !t.startsWith('* User question:') &&
            !t.startsWith('* Target:') &&
            !t.startsWith('* Context:') &&
            !t.startsWith('* Persona:') &&
            !t.startsWith('* Identity:') &&
            !t.startsWith('* Professional Questions:') &&
            !t.startsWith('* Entertaining/Flirting/Rude');
    });

    cleaned = filteredLines.join('\n').trim() || content;
    const lines = cleaned.split('\n');

    return lines.map((line, lineIdx) => {
        let trimmed = line.trim();
        if (!trimmed) return <div key={lineIdx} style={{ height: '6px' }} />;

        // Bullet points (* item or - item)
        const isBullet = /^[*-]\s+/.test(trimmed);
        if (isBullet) {
            trimmed = trimmed.replace(/^[*-]\s+/, '');
        }

        // Parse **bold** and *italic* and `code`
        const parts = [];
        let lastIndex = 0;
        const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
        let match;

        while ((match = regex.exec(trimmed)) !== null) {
            if (match.index > lastIndex) {
                parts.push(trimmed.substring(lastIndex, match.index));
            }
            const matchText = match[0];
            if (matchText.startsWith('**') && matchText.endsWith('**')) {
                parts.push(<strong key={match.index}>{matchText.slice(2, -2)}</strong>);
            } else if (matchText.startsWith('*') && matchText.endsWith('*')) {
                parts.push(<em key={match.index}>{matchText.slice(1, -1)}</em>);
            } else if (matchText.startsWith('`') && matchText.endsWith('`')) {
                parts.push(<code key={match.index} style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{matchText.slice(1, -1)}</code>);
            }
            lastIndex = regex.lastIndex;
        }

        if (lastIndex < trimmed.length) {
            parts.push(trimmed.substring(lastIndex));
        }

        return (
            <div key={lineIdx} style={{ margin: '2px 0', lineHeight: '1.5' }}>
                {isBullet && <span style={{ color: '#00D4FF', marginRight: '6px' }}>•</span>}
                <span>{parts.length > 0 ? parts : trimmed}</span>
            </div>
        );
    });
};

const Chatbot = ({ loggedInUser, setLoggedInUser, setShowAuthModal }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hi there! I'm Altis, Shahriyar's AI assistant. How can I help you today?" }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasPromptedLogin, setHasPromptedLogin] = useState(false);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);


    // Save chat to server when closing (if logged in)
    const saveChatToServer = async () => {
        if (!loggedInUser || messages.length <= 1) return;
        try {
            await fetch(`${API_URL}/chat/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: loggedInUser.id,
                    messages: messages.filter((m, i) => i > 0), // skip the initial greeting
                }),
            });
        } catch (err) { console.error('Failed to save chat:', err); }
    };

    const handleClose = async () => {
        await saveChatToServer();
        setIsOpen(false);
    };

    useEffect(() => {
        const handleToggle = (e) => {
            if (e && e.detail !== undefined) {
                setIsOpen(e.detail);
            } else {
                setIsOpen(prev => !prev);
            }
        };
        window.addEventListener('toggleChatbot', handleToggle);
        return () => window.removeEventListener('toggleChatbot', handleToggle);
    }, []);

    const [viewportHeight, setViewportHeight] = useState(null);

    // Lock body scroll on mobile when chat is open
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (isOpen && window.innerWidth <= 768) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        }
        return () => {
            if (typeof window !== 'undefined') {
                document.body.style.overflow = '';
            }
        };
    }, [isOpen]);

    // Track visualViewport on mobile so input field stays above keyboard
    useEffect(() => {
        if (!isOpen) return;

        const handleViewportResize = () => {
            if (window.visualViewport && window.innerWidth <= 768) {
                setViewportHeight(window.visualViewport.height);
            } else {
                setViewportHeight(null);
            }
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportResize);
            window.visualViewport.addEventListener('scroll', handleViewportResize);
        }

        handleViewportResize();

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleViewportResize);
                window.visualViewport.removeEventListener('scroll', handleViewportResize);
            }
        };
    }, [isOpen]);

    // Auto-scroll logic & Auto-focus input box when ready
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        if (isOpen && !isLoading && !showLoginPrompt) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [messages, showLoginPrompt, isLoading, isOpen]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMessage = { role: 'user', content: inputValue };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputValue('');

        // Check if we need to show login recommendation (after first user message)
        if (!hasPromptedLogin && !loggedInUser) {
            setHasPromptedLogin(true);
            setShowLoginPrompt(true);
            return; // Intercept and wait for user to continue
        }

        await fetchAIResponse(newMessages);
    };

    const fetchAIResponse = async (chatHistory) => {
        setIsLoading(true);
        try {
            // Format history for backend API (skip the initial hardcoded greeting)
            const historyForAPI = chatHistory.filter((msg, idx) => idx !== 0).map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            }));

            // Call the local backend API instead of Google APIs directly
            const response = await fetch(`${API_URL}/chat/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    historyForAPI,
                    SYSTEM_PROMPT
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            const parts = data.candidates?.[0]?.content?.parts;
            if (parts && parts.length > 0) {
                const textPart = parts.find(p => !p.thought) || parts[0];
                let aiText = textPart.text || '';

                // Parse and execute actions
                if (aiText.includes('[ACTION: LOGIN]')) {
                    setShowAuthModal(true);
                    aiText = aiText.replace('[ACTION: LOGIN]', '').trim();
                }

                if (aiText.includes('[ACTION: OPEN_RESUME]')) {
                    // Open resume in a new tab
                    window.open('https://drive.google.com/file/d/1HhX534tO8exquYUH4rBA5l80MiG7tH1F/view', '_blank');
                    aiText = aiText.replace('[ACTION: OPEN_RESUME]', '').trim();
                }

                const scrollMatch = aiText.match(/\[ACTION:\s*SCROLL_TO_([A-Z]+)\]/);
                if (scrollMatch) {
                    const sectionId = scrollMatch[1].toLowerCase();
                    setTimeout(() => {
                        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
                    }, 500);
                    aiText = aiText.replace(scrollMatch[0], '').trim();
                }

                setMessages(prev => [...prev, { role: 'assistant', content: aiText, model: data.modelUsed }]);
            } else {
                console.error("API Error", data);
                throw new Error("Invalid response format");
            }
        } catch (error) {
            console.error("Chatbot API Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Oops! Something went wrong connecting to my brain. Please try again later." }]);
        } finally {
            setIsLoading(false);
            // Re-enable and focus input box immediately
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    };

    const handleContinueWithoutLogin = () => {
        setShowLoginPrompt(false);
        fetchAIResponse(messages);
    };

    const handleQuickChipClick = (promptText) => {
        if (isLoading || showLoginPrompt) return;
        const userMessage = { role: 'user', content: promptText };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);

        if (!hasPromptedLogin && !loggedInUser) {
            setHasPromptedLogin(true);
            setShowLoginPrompt(true);
            return;
        }

        fetchAIResponse(newMessages);
    };

    return (
        <>
            {isOpen && <div className="chatbot-mobile-backdrop" onClick={handleClose} />}

            {!isOpen && (
                <button
                    className="chatbot-floating-btn altis-glow-pulse"
                    onClick={() => setIsOpen(true)}
                    aria-label="Open Altis AI Assistant"
                >
                    <Sparkles size={22} className="ai-sparkle-icon" />
                    <span className="chatbot-floating-label">Ask Altis AI</span>
                </button>
            )}

            {isOpen && (
                <div
                    className="chatbot-window fade-in"
                    style={viewportHeight && typeof window !== 'undefined' && window.innerWidth <= 768 ? { height: `${viewportHeight}px`, top: 0, bottom: 'auto' } : {}}
                >
                    <div className="chatbot-header">
                        <div>
                            <h3>✨ Altis AI</h3>
                            <p>Shahriyar's AI Assistant</p>
                        </div>
                        <div className="chatbot-header-actions">
                            {loggedInUser?.isAdmin && (
                                <button className="admin-btn" onClick={() => window.open('/admin.html', '_blank')} title="Admin Dashboard">
                                    <Shield size={18} />
                                </button>
                            )}
                            <button className="chatbot-close" onClick={handleClose}>
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="chatbot-messages">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`chat-bubble-container ${msg.role}`}>
                                <div className="chat-avatar">
                                    {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                                </div>
                                <div className="chat-bubble">
                                    {renderFormattedMessage(msg.content)}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="chat-bubble-container assistant">
                                <div className="chat-avatar"><Bot size={16} /></div>
                                <div className="chat-bubble typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}

                        {showLoginPrompt && (
                            <div className="login-recommendation">
                                <Sparkles className="login-icon" size={24} />
                                <h4>Want to save your chat?</h4>
                                <p>Log in to keep your conversation history and get personalized answers.</p>
                                <div className="login-actions">
                                    <button className="btn-primary login-btn-mock" onClick={() => setShowAuthModal(true)}>Log In</button>
                                    <button className="btn-outline" onClick={handleContinueWithoutLogin}>Just Chat</button>
                                </div>
                            </div>
                        )}

                        {/* Quick Suggestion Chips */}
                        {messages.length <= 2 && !isLoading && !showLoginPrompt && (
                            <div className="chat-suggestion-chips">
                                <button onClick={() => handleQuickChipClick("✨ What are Shahriyar's key skills?")}>
                                    ✨ Key Skills
                                </button>
                                <button onClick={() => handleQuickChipClick("🚀 Show me your top projects")}>
                                    🚀 Top Projects
                                </button>
                                <button onClick={() => handleQuickChipClick("📄 How can I open your resume?")}>
                                    📄 Open Resume
                                </button>
                                <button onClick={() => handleQuickChipClick("📱 How do I get in touch with Shahriyar?")}>
                                    📱 Contact
                                </button>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <form className="chatbot-input-area" onSubmit={handleSendMessage}>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Ask Altis AI about Shahriyar..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            disabled={showLoginPrompt || isLoading}
                        />
                        <button type="submit" disabled={!inputValue.trim() || showLoginPrompt || isLoading} className="send-btn">
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default Chatbot;
