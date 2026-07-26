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
        // Continue to answer the last user message
        fetchAIResponse(messages);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="chatbot-window fade-in">
                <div className="chatbot-header">
                    <div>
                        <h3>✨ Altis AI</h3>
                        <p>Made by Shahriyar</p>
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
                                {msg.content}
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
                    <div ref={messagesEndRef} />
                </div>

                <form className="chatbot-input-area" onSubmit={handleSendMessage}>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Ask about Shahriyar..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        disabled={showLoginPrompt || isLoading}
                    />
                    <button type="submit" disabled={!inputValue.trim() || showLoginPrompt || isLoading} className="send-btn">
                        <Send size={18} />
                    </button>
                </form>
            </div>


        </>
    );
};

export default Chatbot;
