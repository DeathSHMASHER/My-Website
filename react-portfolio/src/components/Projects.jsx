const Projects = () => {
    return (
        <section id="projects">
            <div className="container">
                <div className="section-header reveal">
                    <div className="section-label">My Work</div>
                    <h2 className="section-title">Featured <span className="gradient-text">Projects</span></h2>
                    <p className="section-desc">Real-world applications built with modern technologies</p>
                </div>
                <div className="projects-grid">
                    <div className="project-card liquid-glass liquid-glass-continuous reveal" style={{ '--shimmer-delay': '0s' }}>
                        <div className="project-img">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                            </svg>
                        </div>
                        <div className="project-body">
                            <h3>Jigyasa Science Academy</h3>
                            <p>Comprehensive academic tuition & coaching platform for Class 5–12 students featuring student dashboards, real-time feedback rating dials, attendance tracking, and 1-on-1 doubt resolution desk.</p>
                            <div className="project-techs">
                                <span>JavaScript</span><span>HTML/CSS</span><span>Student Portal</span><span>EdTech</span><span>Live App</span>
                            </div>
                            <div className="project-links">
                                <a href="https://jigyassa.netlify.app" target="_blank" rel="noopener noreferrer">Live Demo ↗</a>
                                <a href="https://github.com/DeathSHMASHER/Coching" target="_blank" rel="noopener noreferrer">GitHub →</a>
                            </div>
                        </div>
                    </div>
                    <div className="project-card liquid-glass liquid-glass-continuous reveal reveal-delay-1" style={{ '--shimmer-delay': '1s' }}>
                        <div className="project-img">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
                            </svg>
                        </div>
                        <div className="project-body">
                            <h3>KIIT FEST IoT Portal</h3>
                            <p>Dynamic portal for KIIT FEST's IoT division with real-time event tracking, live quiz sessions for 17 teams, and instant feedback system.</p>
                            <div className="project-techs">
                                <span>HTML/CSS</span><span>JavaScript</span><span>Real-time</span><span>IoT</span>
                            </div>
                            <div className="project-links">
                                <a href="https://github.com/SHAHRIYARTAUFIK/kiitfest8.0_IOT_BAKEOFF" target="_blank" rel="noopener noreferrer">GitHub →</a>
                            </div>
                        </div>
                    </div>
                    <div className="project-card liquid-glass liquid-glass-continuous reveal reveal-delay-2" style={{ '--shimmer-delay': '2s' }}>
                        <div className="project-img">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                            </svg>
                        </div>
                        <div className="project-body">
                            <h3>Alpha Codes Template Suite</h3>
                            <p>High-performance, responsive website templates with modular design, modern aesthetics, and developer-friendly customization for Alpha Codes.</p>
                            <div className="project-techs">
                                <span>React</span><span>Node.js</span><span>Templates</span><span>E-commerce</span>
                            </div>
                            <div className="project-links">
                                <a href="https://github.com/SHAHRIYARTAUFIK/website-templates" target="_blank" rel="noopener noreferrer">GitHub →</a>
                            </div>
                        </div>
                    </div>
                    <div className="project-card liquid-glass liquid-glass-continuous reveal reveal-delay-2" style={{ '--shimmer-delay': '0.5s' }}>
                        <div className="project-img">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                            </svg>
                        </div>
                        <div className="project-body">
                            <h3>CareerNest</h3>
                            <p>An innovative career and job portal platform focused on connecting candidates. Built during the 404 NOT OUT Hackathon where we secured <strong>2nd Place</strong>.</p>
                            <div className="project-techs">
                                <span>React</span><span>Node.js</span><span>Hackathon</span>
                            </div>
                            <div className="project-links">
                                <a href="https://github.com/SHAHRIYARTAUFIK/CareerNest-404_NOT_OUT-" target="_blank" rel="noopener noreferrer">GitHub →</a>
                            </div>
                        </div>
                    </div>
                    <div className="project-card liquid-glass liquid-glass-continuous reveal" style={{ '--shimmer-delay': '1s' }}>
                        <div className="project-img">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5M12 10.5v9M9 15h6" />
                            </svg>
                        </div>
                        <div className="project-body">
                            <h3>AI-Generated TimeTable</h3>
                            <p>Smart timetable generation system built for SIH. Successfully cleared university shortlisting to become one of the top 70 teams out of 750+ entries.</p>
                            <div className="project-techs">
                                <span>AI</span><span>SIH</span><span>Scheduling</span>
                            </div>
                            <div className="project-links">
                                <a href="https://github.com/SHAHRIYARTAUFIK/AI-Generated-TimeTable-" target="_blank" rel="noopener noreferrer">GitHub →</a>
                            </div>
                        </div>
                    </div>
                    <div className="project-card liquid-glass liquid-glass-continuous reveal reveal-delay-1" style={{ '--shimmer-delay': '1.5s' }}>
                        <div className="project-img">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                            </svg>
                        </div>
                        <div className="project-body">
                            <h3>2-Player Browser Games</h3>
                            <p>A collection of interactive browsers games including turn-based Element Battle, Space Duel, Hex Connect, and Tic-Tac-Toe.</p>
                            <div className="project-techs">
                                <span>HTML/CSS</span><span>JavaScript</span><span>Tailwind</span><span>Gaming</span>
                            </div>
                            <div className="project-links">
                                <a href="https://github.com/SHAHRIYARTAUFIK/2-player-games" target="_blank" rel="noopener noreferrer">GitHub →</a>
                            </div>
                        </div>
                    </div>
                    <div className="project-card liquid-glass liquid-glass-continuous reveal reveal-delay-2" style={{ '--shimmer-delay': '2.5s' }}>
                        <div className="project-img">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                            </svg>
                        </div>
                        <div className="project-body">
                            <h3>Fruit & Veg Detector</h3>
                            <p>An intelligent AI system that detects and identifies 36 classes of fruits and vegetables. Combines YOLOv8 for precise localization with HuggingFace ViT for state-of-the-art classification.</p>
                            <div className="project-techs">
                                <span>Python</span><span>YOLOv8</span><span>HuggingFace</span><span>Gradio</span>
                            </div>
                            <div className="project-links">
                                <a href="https://github.com/SHAHRIYARTAUFIK/Fruit-and-veg-" target="_blank" rel="noopener noreferrer">GitHub →</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Projects;
