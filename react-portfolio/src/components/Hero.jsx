import { TypeAnimation } from 'react-type-animation';

const Hero = () => {
    return (
        <section id="hero" style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>

            {/* DOM Content Overlay */}
            <div className="container hero-content" style={{ zIndex: 2, pointerEvents: 'none' }}>
                <h1 className="hero-title">
                    Hi, I'm <span className="gradient-text">Shahriyar Taufik</span>
                </h1>
                <div style={{ marginBottom: '12px' }}>
                    {/* Using liquid-glass CSS fallback on the text wrapper for double layered effect */}
                    <p className="hero-subtitle liquid-glass liquid-glass-continuous"
                        style={{ padding: '14px 32px', borderRadius: '100px', fontWeight: 500, marginBottom: 0, display: 'inline-block' }}>
                        Engineering Innovator  <TypeAnimation
                            sequence={[
                                'Building Scalable Full Stack Web with AI Integration',
                                1000,
                                'Exploring AI, IoT, and LLMs',
                                1000,
                                'Architecting Robust Backend Systems',
                                1000,
                                'Crafting High-Performance User Experiences',
                                1000
                            ]}
                            wrapper="span"
                            speed={50}
                            repeat={Infinity}
                            style={{ display: 'inline-block' }}
                        />
                    </p>
                </div>
                <p className="hero-desc">
                    Transforming complex ideas into scalable, high-performance digital solutions.
                    Specializing in full-stack web architectures, machine learning models, and Generative AI pipelines.
                </p>
                <div className="hero-btns" style={{ pointerEvents: 'auto' }}>
                    <a
                        href="https://drive.google.com/file/d/187WW4781PgCIR7DMkA_Wb4xzLqsIlx1c/view?usp=sharing"
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary"
                    >
                        Resume
                    </a>
                    <a href="#contact" className="btn btn-outline">Let's Talk</a>
                </div>
            </div>
        </section>
    );
};

export default Hero;
