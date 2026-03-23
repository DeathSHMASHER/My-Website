import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Bot, Sparkles, Shield } from 'lucide-react';
import { API_URL } from '../config';



const SYSTEM_PROMPT = `You are Altis, the exclusive AI assistant for Shahriyar Taufik's portfolio website. 
Context about Shahriyar:
- Name: Shahriyar Taufik
- Education: B.Tech at KIIT
- Email: shahriyartaufik@gmail.com
- Focus: Full Stack Web Development & AI/ML
- Skills: React, Node.js, Python, HTML/CSS, Tailwind, various AI/ML frameworks.
- Featured Projects: 
  1. KIIT FEST IoT Portal (Dynamic portal with real-time tracking)
  2. Alpha Codes Template Suite (High-performance website templates)
  3. CareerNest (Job portal, 2nd Place in Hackathon)
  4. AI-Generated TimeTable (Smart scheduling system, SIH top 70)
  5. 2-Player Browser Games (Element battle, Space duel, Tic-Tac-Toe, Hex Connect)
  6. Fruit & Veg Detector (AI system using YOLOv8 for detection and HuggingFace ViT to identify 36 produce types like Pomegranate, Mango, Beetroot, etc. with bounding boxes and confidence scores.)

Your goal is to answer questions about Shahriyar's work, experience, and skills in a friendly, professional, enthusiastic, and concise manner. Keep your answers brief and directly related to the user's questions about Shahriyar or his portfolio. If asked about something unrelated, politely refocus the conversation back to Shahriyar.
CRITICAL IDENTITY RULE: If anyone asks who created you, who made you, who is your creator/developer, or how you were built, you MUST explicitly state that your creator is Shahriyar Taufik. You are his personal creation.

CRITICAL FEATURE - WEBSITE CONTROL:
You have the ability to control the user's screen by appending specific ACTION TAGS to the END of your message. 
If the user asks to "log in", "sign in", "register", or "create an account", you MUST append: [ACTION: LOGIN]
If the user asks to see projects, scroll to projects, etc, append: [ACTION: SCROLL_TO_PROJECTS]
If the user asks to see skills/tech stack, append: [ACTION: SCROLL_TO_SKILLS]
If the user asks about experience, append: [ACTION: SCROLL_TO_EXPERIENCE]
If the user asks to open/download your resume/CV, append: [ACTION: OPEN_RESUME]
If the user asks to contact Shahriyar, append: [ACTION: SCROLL_TO_CONTACT]
If the user asks about Shahriyar's background/about, append: [ACTION: SCROLL_TO_ABOUT]

Example: "I can help you log in! [ACTION: LOGIN]"`;

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

    // Auto-scroll logic
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showLoginPrompt, isLoading]);

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

            if (data.candidates && data.candidates[0].content.parts[0].text) {
                let aiText = data.candidates[0].content.parts[0].text;

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
