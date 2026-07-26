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
                        <p>I'm Shahriyar Taufik, a passionate Web Developer specializing in crafting cutting-edge,
                            user-centric digital solutions. My core philosophy revolves around merging innovative technology
                            with intuitive design to create impactful web applications.</p>
                        <p>With a strong foundation in modern front-end and back-end technologies, I thrive on solving
                            complex problems and pushing the boundaries of what's possible on the web. Proficient in React,
                            Node.js, Python, and various AI/ML frameworks.</p>
                        <p>Beyond coding, I'm an avid learner constantly exploring emerging tech landscapes and seeking new
                            challenges that foster growth and innovation. My goal is to not just build websites, but to
                            engineer experiences.</p>
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
