const About = () => {
    return (
        <section id="about">
            <div className="container">
                <div className="section-header reveal">
                    <div className="section-label">About Me</div>
                    <h2 className="section-title">Passionate <span className="gradient-text">Developer</span> & Innovator</h2>
                </div>
                <div className="about-grid">
                    <div className="about-avatar reveal">
                        <div className="avatar-ring">
                            <div className="avatar-inner">
                                <img src="/profile-glass.png" alt="Shahriyar Taufik" className="profile-img" />
                            </div>
                        </div>
                    </div>
                    <div className="about-text about-text-card reveal reveal-delay-1">
                        <p>I'm Shahriyar Taufik, a passionate Full-Stack Developer and AI Engineer specializing in crafting cutting-edge,
                            user-centric digital systems. My core philosophy revolves around merging innovative AI models
                            with intuitive design to engineer production-ready web platforms.</p>
                        <p>With expertise bridging deep learning architectures and high-performance full-stack web applications, I design and deploy complex production systems—from dual-model computer vision engines (like ProduceVision Studio Pro) and enterprise agentic feedback platforms (Project LOOP) to IoT sensor telemetry and BCI neural pipelines.</p>
                        <p>Beyond coding, I'm an avid learner constantly exploring emerging tech landscapes and seeking new
                            challenges that foster growth and innovation. My goal is to not just build websites, but to
                            engineer impactful, production-grade intelligence.</p>
                        <div className="about-info">
                            <div className="info-card">
                                <div className="label">Name</div>
                                <div className="value">Shahriyar Taufik</div>
                            </div>
                            <div className="info-card">
                                <div className="label">Education</div>
                                <div className="value">B.Tech at KIIT</div>
                            </div>
                            <div className="info-card">
                                <div className="label">Email</div>
                                <div className="value">shahriyartaufik@gmail.com</div>
                            </div>
                            <div className="info-card">
                                <div className="label">Focus</div>
                                <div className="value">Full Stack & AI/ML</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default About;
