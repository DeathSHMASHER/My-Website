import { useState } from 'react';
import { API_URL } from '../config';

const Contact = () => {
    const [btnText, setBtnText] = useState('Send Message');
    const [btnStyle, setBtnStyle] = useState({});

    const handleSubmit = async (e) => {
        e.preventDefault();

        const name = e.target.name.value;
        const email = e.target.email.value;
        const message = e.target.message.value;

        setBtnText('Sending...');
        setBtnStyle({});

        try {
            const response = await fetch(`${API_URL}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, message })
            });

            if (response.ok) {
                setBtnText('Message Sent! \u2713');
                setBtnStyle({ background: 'linear-gradient(135deg,#10b981,#059669)' });
                setTimeout(() => {
                    setBtnText('Send Message');
                    setBtnStyle({});
                    e.target.reset();
                }, 3000);
            } else {
                setBtnText('Error Sending!');
                setBtnStyle({ background: 'linear-gradient(135deg,#ef4444,#dc2626)' });
                setTimeout(() => {
                    setBtnText('Send Message');
                    setBtnStyle({});
                }, 3000);
            }
        } catch (error) {
            console.error('Contact form error:', error);
            setBtnText('Network Error!');
            setBtnStyle({ background: 'linear-gradient(135deg,#ef4444,#dc2626)' });
            setTimeout(() => {
                setBtnText('Send Message');
                setBtnStyle({});
            }, 3000);
        }
    };

    return (
        <section id="contact">
            <div className="container">
                <div className="section-header reveal">
                    <div className="section-label">Get In Touch</div>
                    <h2 className="section-title">Let's <span className="gradient-text">Connect</span></h2>
                    <p className="section-desc">Have a project idea, a question, or just want to say hello? I'd love to hear from you.</p>
                </div>
                <div className="contact-grid">
                    <div className="contact-info reveal">
                        <h3>Let's build something <span className="gradient-text">amazing</span> together</h3>
                        <p>Whether you have a visionary project, a complex challenge, or an opportunity to redefine digital boundaries &mdash; my console is open.</p>
                        <div className="contact-links">
                            <a href="mailto:shahriyartaufik@gmail.com" className="contact-link liquid-glass liquid-glass-continuous" style={{ '--shimmer-delay': '0s' }}>
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <div>
                                    <div className="cl-label">Email</div>
                                    <div className="cl-value">shahriyartaufik@gmail.com</div>
                                </div>
                            </a>
                            <a href="https://www.linkedin.com/in/shahriyar-taufik-19662b287/" target="_blank" rel="noopener noreferrer" className="contact-link liquid-glass liquid-glass-continuous" style={{ '--shimmer-delay': '1s' }}>
                                <svg fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                                <div>
                                    <div className="cl-label">LinkedIn</div>
                                    <div className="cl-value">Shahriyar Taufik</div>
                                </div>
                            </a>
                            <a href="https://github.com/SHAHRIYARTAUFIK" target="_blank" rel="noopener noreferrer" className="contact-link liquid-glass liquid-glass-continuous" style={{ '--shimmer-delay': '2s' }}>
                                <svg fill="currentColor" viewBox="0 0 24 24">
                                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.074 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.026 2.747-1.026.546 1.379.201 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12.017C22 6.484 17.522 2 12 2Z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <div className="cl-label">GitHub</div>
                                    <div className="cl-value">SHAHRIYARTAUFIK</div>
                                </div>
                            </a>
                        </div>
                    </div>
                    <div className="contact-form liquid-glass reveal reveal-delay-1">
                        <form id="contactForm" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="name">Your Name</label>
                                <input type="text" id="name" placeholder="Shahriyar Taufik" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Your Email</label>
                                <input type="email" id="email" placeholder="shahriyar@gmail.com" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="message">Message</label>
                                <textarea id="message" placeholder="Tell me about your project..." required></textarea>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', ...btnStyle }}>
                                {btnText}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Contact;
