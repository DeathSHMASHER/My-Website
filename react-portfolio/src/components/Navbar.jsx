import { useState, useEffect } from 'react';
import { Menu, X, LogOut } from 'lucide-react';

const Navbar = ({ loggedInUser, onLogout, onLoginClick }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState('hero');
    const [hoveredSection, setHoveredSection] = useState(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ opacity: 0, left: 0, width: 0, scaleX: 1, scale: 1, isMoving: false });
    const [isClicking, setIsClicking] = useState(false);
    const [isChatActive, setIsChatActive] = useState(false);

    useEffect(() => {
        const handleChatState = (e) => {
            if (e && e.detail) {
                setIsChatActive(Boolean(e.detail.isOpen));
            }
        };
        window.addEventListener('chatbotStateChange', handleChatState);
        return () => window.removeEventListener('chatbotStateChange', handleChatState);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);

            // ScrollSpy logic - if near top, always default to Home ('hero')
            if (window.scrollY < 150) {
                setActiveSection('hero');
                return;
            }

            const sections = document.querySelectorAll('section');
            let current = 'hero';
            sections.forEach((section) => {
                const sectionTop = section.offsetTop;
                if (window.scrollY >= sectionTop - 150) {
                    current = section.getAttribute('id') || '';
                }
            });
            if (current) {
                setActiveSection(current);
            }
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const updateIndicator = () => {
            if (window.innerWidth <= 768) {
                setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
                return;
            }

            // Target either the hovered link, or fallback to the active section (default 'hero' / Home)
            let targetId = hoveredSection || activeSection || 'hero';

            let targetLink = document.querySelector(`.nav-links a[href="#${targetId}"]`);

            if (targetId === 'resume') {
                targetLink = document.querySelector(`.nav-links a[href="https://drive.google.com/file/d/187WW4781PgCIR7DMkA_Wb4xzLqsIlx1c/view?usp=sharing"]`);
            }

            if (targetLink) {
                const parent = targetLink.closest('li');
                if (parent) {
                    setIndicatorStyle(prev => {
                        const isMoving = prev.left !== 0 && Math.abs(prev.left - parent.offsetLeft) > 10;
                        const stretchScale = isMoving ? 1.2 : 1;
                        const growScale = isMoving ? 1.08 : 1;

                        return {
                            opacity: 1,
                            left: parent.offsetLeft,
                            width: parent.offsetWidth,
                            scaleX: stretchScale,
                            scale: growScale,
                            isMoving: isMoving
                        };
                    });

                    setTimeout(() => {
                        setIndicatorStyle(prev => ({ ...prev, scaleX: 1, scale: 1, isMoving: false }));
                    }, 280);
                }
            } else {
                setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
            }
        };

        updateIndicator();
        window.addEventListener('resize', updateIndicator);
        const timeoutId = setTimeout(updateIndicator, 100);

        return () => {
            window.removeEventListener('resize', updateIndicator);
            clearTimeout(timeoutId);
        };
    }, [activeSection, hoveredSection]);

    const handleOpenChatbot = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setIsOpen(false);

        let triggerRect = null;
        if (e && e.currentTarget && typeof e.currentTarget.getBoundingClientRect === 'function') {
            const r = e.currentTarget.getBoundingClientRect();
            triggerRect = { left: r.left, top: r.top, width: r.width, height: r.height };
        } else {
            const btn = document.getElementById('navAskAltisBtn');
            if (btn) {
                const r = btn.getBoundingClientRect();
                triggerRect = { left: r.left, top: r.top, width: r.width, height: r.height };
            }
        }

        const chatbotDataEvent = new CustomEvent('toggleChatbot', {
            detail: { open: true, triggerRect }
        });
        window.dispatchEvent(chatbotDataEvent);
    };

    const navSections = [
        { id: 'hero', label: 'Home' },
        { id: 'about', label: 'About' },
        { id: 'skills', label: 'Skills' },
        { id: 'projects', label: 'Projects' },
        { id: 'experience', label: 'Experience' },
        { id: 'education', label: 'Education' },
        { id: 'certifications', label: 'Certs' },
        { id: 'contact', label: 'Contact' },
    ];

    return (
        <header id="header" className={scrolled ? 'scrolled' : ''}>
            <nav className="container">
                <div className="nav-brand">
                    {loggedInUser ? (
                        <button onClick={onLogout} className="nav-auth-toggle logout-toggle" title="Logout">
                            <span className="nav-logo text-default" style={{ textTransform: 'capitalize' }}>
                                {loggedInUser.name.split(' ')[0]}
                            </span>
                            <span className="text-hover" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Logout</span>
                        </button>
                    ) : (
                        <button onClick={onLoginClick} className="nav-auth-toggle login-toggle" title="Login">
                            <span className="nav-logo text-default">ST</span>
                            <span className="nav-logo text-hover">Login</span>
                        </button>
                    )}
                </div>

                {/* Center Navigation Pill (Desktop) */}
                <div className="nav-center-pill">
                    <ul
                        className="nav-links"
                        id="navLinks"
                        onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * 100;
                            e.currentTarget.style.setProperty('--liquid-x', `${x.toFixed(1)}%`);
                        }}
                        onMouseLeave={(e) => {
                            setHoveredSection(null);
                            setIsClicking(false);
                            e.currentTarget.style.removeProperty('--liquid-x');
                        }}
                        onMouseUp={() => setIsClicking(false)}
                        onTouchEnd={() => setIsClicking(false)}
                    >
                        <div
                            className={`nav-indicator ${isClicking || indicatorStyle.isMoving ? 'clear-glass' : 'blur-glass'}`}
                            id="navIndicator"
                            style={{
                                opacity: indicatorStyle.opacity,
                                left: `${indicatorStyle.left}px`,
                                width: `${indicatorStyle.width}px`,
                                transform: `translateY(-50%) scaleX(${indicatorStyle.scaleX}) scale(${isClicking ? 0.88 : indicatorStyle.scale || 1})`,
                                transition: 'left 0.4s cubic-bezier(0.22, 1, 0.36, 1), width 0.3s cubic-bezier(0.22, 1, 0.36, 1), transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
                            }}
                        />
                        {navSections.map(({ id, label }) => {
                            const isCurrentHighlight = hoveredSection ? hoveredSection === id : activeSection === id;
                            return (
                                <li
                                    key={id}
                                    onMouseEnter={() => setHoveredSection(id)}
                                >
                                    <a
                                        href={`#${id}`}
                                        onMouseDown={() => setIsClicking(true)}
                                        onTouchStart={() => setIsClicking(true)}
                                        className={isCurrentHighlight ? 'active' : ''}
                                    >
                                        {label}
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* Right Side Actions: Liquid Glass "Ask Altis AI" Button + Hamburger */}
                <div className="nav-actions">
                    <button
                        className={`use-ai-btn altis-nav-cyber-btn altis-liquid-glass-btn ${isChatActive ? 'morph-hidden' : ''}`}
                        onClick={handleOpenChatbot}
                        aria-label="Open Altis AI Assistant"
                        id="navAskAltisBtn"
                    >
                        <span className="liquid-glass-glare" />
                        <span className="altis-nav-sparkle">
                            <svg viewBox="-2 -2 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
                                <defs>
                                    <linearGradient id="ai-prism-grad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stopColor="#00F0FF" />
                                        <stop offset="35%" stopColor="#80F5FF" />
                                        <stop offset="65%" stopColor="#C084FC" />
                                        <stop offset="100%" stopColor="#E879F9" />
                                    </linearGradient>
                                    <linearGradient id="ai-mini-grad" x1="16" y1="1" x2="22" y2="7" gradientUnits="userSpaceOnUse">
                                        <stop offset="0%" stopColor="#80F5FF" />
                                        <stop offset="50%" stopColor="#FFFFFF" />
                                        <stop offset="100%" stopColor="#C084FC" />
                                    </linearGradient>
                                    <filter id="ai-luminous-glow" x="-30%" y="-30%" width="160%" height="160%">
                                        <feGaussianBlur stdDeviation="1.2" result="glow" />
                                        <feComposite in="SourceGraphic" in2="glow" operator="over" />
                                    </filter>
                                </defs>
                                <path
                                    d="M12 2 C12.6 7.2 16.8 11.4 22 12 C16.8 12.6 12.6 16.8 12 22 C11.4 16.8 7.2 12.6 2 12 C7.2 11.4 11.4 7.2 12 2 Z"
                                    fill="url(#ai-prism-grad)"
                                    opacity="0.4"
                                    filter="url(#ai-luminous-glow)"
                                />
                                <path
                                    d="M12 2 C12.6 7.2 16.8 11.4 22 12 C16.8 12.6 12.6 16.8 12 22 C11.4 16.8 7.2 12.6 2 12 C7.2 11.4 11.4 7.2 12 2 Z"
                                    fill="url(#ai-prism-grad)"
                                />
                                <path
                                    d="M12 5.5 C12.4 9 15 11.6 18.5 12 C15 12.4 12.4 15 12 18.5 C11.6 15 9 12.4 5.5 12 C9 11.6 11.6 9 12 5.5 Z"
                                    fill="rgba(255, 255, 255, 0.45)"
                                />
                                <path
                                    d="M19 1.5 C19.3 3.3 20.2 4.2 22 4.5 C20.2 4.8 19.3 5.7 19 7.5 C18.7 5.7 17.8 4.8 16 4.5 C17.8 4.2 18.7 3.3 19 1.5 Z"
                                    fill="url(#ai-mini-grad)"
                                />
                                <circle cx="12" cy="12" r="1.6" fill="#FFFFFF" />
                            </svg>
                        </span>
                        <span className="altis-nav-label">Ask Altis <span className="altis-highlight">AI</span></span>
                        <span className="altis-nav-dot" />
                    </button>

                    <button className="menu-btn" aria-label="Menu" onClick={() => setIsOpen(!isOpen)}>
                        {isOpen ? <X size={26} /> : <Menu size={26} />}
                    </button>
                </div>
            </nav>

            {/* Separated Mobile Menu Overlay & Drawer */}
            <div
                className={`mobile-menu-backdrop ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(false)}
            />
            <div className={`mobile-menu-drawer ${isOpen ? 'open' : ''}`}>
                <div className="mobile-drawer-header">
                    <div className="nav-logo">ST</div>
                    <button
                        className="mobile-drawer-close-btn"
                        onClick={() => setIsOpen(false)}
                        aria-label="Close menu"
                    >
                        <X size={22} />
                    </button>
                </div>

                <div className="mobile-drawer-content">
                    <ul className="mobile-nav-list">
                        {navSections.map(({ id, label }) => (
                            <li key={id}>
                                <a
                                    href={`#${id}`}
                                    onClick={() => setIsOpen(false)}
                                    className={activeSection === id ? 'active' : ''}
                                >
                                    {label}
                                </a>
                            </li>
                        ))}
                    </ul>

                    <div className="mobile-drawer-actions">
                        <button
                            className={`mobile-drawer-ai-btn altis-liquid-glass-btn ${isChatActive ? 'morph-hidden' : ''}`}
                            onClick={handleOpenChatbot}
                        >
                            <span className="liquid-glass-glare" />
                            <span className="altis-nav-sparkle">
                                <svg viewBox="-2 -2 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 20, height: 20 }}>
                                    <path d="M12 2 C12.6 7.2 16.8 11.4 22 12 C16.8 12.6 12.6 16.8 12 22 C11.4 16.8 7.2 12.6 2 12 C7.2 11.4 11.4 7.2 12 2 Z" fill="#00F0FF" />
                                    <circle cx="12" cy="12" r="1.6" fill="#FFFFFF" />
                                </svg>
                            </span>
                            <span>Ask Altis AI Assistant</span>
                        </button>

                        <div className="mobile-drawer-auth">
                            {loggedInUser ? (
                                <button onClick={() => { setIsOpen(false); onLogout(); }} className="mobile-auth-btn logout">
                                    Logout ({loggedInUser.name.split(' ')[0]})
                                </button>
                            ) : (
                                <button onClick={() => { setIsOpen(false); onLoginClick(); }} className="mobile-auth-btn login">
                                    Login / Register
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;