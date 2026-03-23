import { useState, useEffect } from 'react';
import { Menu, X, LogOut } from 'lucide-react';

const Navbar = ({ loggedInUser, onLogout, onLoginClick }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState('');
    const [hoveredSection, setHoveredSection] = useState(null);
    const [indicatorStyle, setIndicatorStyle] = useState({ opacity: 0, left: 0, width: 0, scaleX: 1, scale: 1, isMoving: false });
    const [isClicking, setIsClicking] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);

            // ScrollSpy logic
            const sections = document.querySelectorAll('section');
            let current = '';
            sections.forEach((section) => {
                const sectionTop = section.offsetTop;
                if (window.scrollY >= sectionTop - 100) {
                    current = section.getAttribute('id') || '';
                }
            });
            setActiveSection(current);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const updateIndicator = () => {
            if (window.innerWidth <= 768) {
                setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
                return;
            }

            // Target either the hovered link, or fallback to the active section
            let targetId = hoveredSection || activeSection;
            if (!targetId && !hoveredSection) {
                setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
                return;
            }

            let targetLink = document.querySelector(`.nav-links a[href="#${targetId}"]`);

            // Special cases for external or action links that don't have standard hash hrefs
            if (targetId === 'resume') {
                targetLink = document.querySelector(`.nav-links a[href="https://drive.google.com/file/d/1HhX534tO8exquYUH4rBA5l80MiG7tH1F/view?usp=sharing"]`);
            } else if (targetId === 'use-ai') {
                targetLink = document.querySelector(`.nav-links .use-ai-btn`);
            }

            if (targetLink) {
                const parent = targetLink.closest('li');
                if (parent) {
                    setIndicatorStyle(prev => {
                        // Calculate distance to determine stretch amount
                        const isMoving = prev.left !== 0 && Math.abs(prev.left - parent.offsetLeft) > 10;
                        const stretchScale = isMoving ? 1.25 : 1;
                        const growScale = isMoving ? 1.15 : 1;

                        // Add padding specifically for the Use AI button to cover its horizontal bounds
                        const isUseAITarget = targetId === 'use-ai';
                        const extraWidth = isUseAITarget ? 8 : 0;
                        const offsetLeft = isUseAITarget ? (parent.offsetLeft - 4) : parent.offsetLeft;

                        return {
                            opacity: 1,
                            left: offsetLeft,
                            width: parent.offsetWidth + extraWidth,
                            scaleX: stretchScale,
                            scale: growScale,
                            isMoving: isMoving
                        };
                    });

                    // Revert stretch and growth after movement
                    setTimeout(() => {
                        setIndicatorStyle(prev => ({ ...prev, scaleX: 1, scale: 1, isMoving: false }));
                    }, 280);
                }
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

    return (
        <header id="header" className={scrolled ? 'scrolled' : ''}>
            <nav className="container">
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
                <button className="menu-btn" aria-label="Menu" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <X /> : <Menu />}
                </button>
                <ul className={`nav-links ${isOpen ? 'open' : ''}`} id="navLinks"
                    onMouseLeave={() => { setHoveredSection(null); setIsClicking(false); }}
                    onMouseUp={() => setIsClicking(false)}
                    onTouchEnd={() => setIsClicking(false)}
                >
                    <div className={`nav-indicator ${isClicking || indicatorStyle.isMoving ? 'clear-glass' : 'blur-glass'} ${hoveredSection === 'use-ai' ? 'hovering-ai' : ''}`} id="navIndicator" style={{
                        opacity: indicatorStyle.opacity,
                        left: `${indicatorStyle.left}px`,
                        width: `${indicatorStyle.width}px`,
                        transform: `translateY(-50%) scaleX(${indicatorStyle.scaleX}) scale(${isClicking ? 0.85 : indicatorStyle.scale || 1})`,
                        transition: 'left 0.44s cubic-bezier(0.22, 1, 0.36, 1), width 0.33s cubic-bezier(0.22, 1, 0.36, 1), transform 0.33s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.33s ease, background 0.33s ease, backdrop-filter 0.33s ease',
                    }}></div>
                    {['hero', 'about', 'skills', 'projects', 'experience', 'education', 'certifications', 'contact'].map((section) => (
                        <li key={section}>
                            <a
                                href={`#${section}`}
                                onClick={() => setIsOpen(false)}
                                onMouseEnter={() => setHoveredSection(section)}
                                onMouseDown={() => setIsClicking(true)}
                                onTouchStart={() => setIsClicking(true)}
                                className={activeSection === section ? 'active' : ''}
                                style={{ textTransform: 'capitalize' }}
                            >
                                {section === 'certifications' ? 'Certs' : section === 'hero' ? 'Home' : section}
                            </a>
                        </li>
                    ))}
                    <li>
                        <button
                            className="use-ai-btn"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const chatbotDataEvent = new CustomEvent('toggleChatbot', { detail: true });
                                window.dispatchEvent(chatbotDataEvent);
                            }}
                            onMouseEnter={() => setHoveredSection('use-ai')}
                        >
                            Use AI ↗
                        </button>
                    </li>
                </ul>
            </nav>
        </header>
    );
};

export default Navbar;