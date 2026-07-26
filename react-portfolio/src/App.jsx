import React, { useEffect, useState } from 'react';
import Preloader from './components/Preloader';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Skills from './components/Skills';
import Projects from './components/Projects';
import Experience from './components/Experience';
import Education from './components/Education';
import Certifications from './components/Certifications';
import Contact from './components/Contact';
import Footer from './components/Footer';
import CursorGlow from './components/CursorGlow';
import Global3DBackground from './components/Global3DBackground';
import Chatbot from './components/Chatbot';
import AuthModal from './components/AuthModal';
import { API_URL } from './config';

function App() {
  // Warm up backend on page load (wakes up sleeping Render free instance immediately)
  useEffect(() => {
    fetch(`${API_URL}/ping`).catch(() => {});
  }, []);

  const [loggedInUser, setLoggedInUserState] = useState(() => {
    try {
      const stored = localStorage.getItem('loggedInUser');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);

  const setLoggedInUser = (user) => {
    setLoggedInUserState(user);
    if (user) {
      localStorage.setItem('loggedInUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('loggedInUser');
    }
  };

  const handleLogout = () => {
    setLoggedInUser(null);
  };

  // Intersection Observer for Scroll Reveal animations
  useEffect(() => {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');

          // Counter animation logic
          if (e.target.closest('.stats-bar')) {
            document.querySelectorAll('.stat-number[data-count]').forEach((el) => {
              if (el.dataset.animated) return;
              el.dataset.animated = 'true';
              const target = +el.dataset.count;
              let current = 0;
              const step = Math.max(1, Math.ceil(target / 40));
              const timer = setInterval(() => {
                current += step;
                if (current >= target) {
                  current = target;
                  clearInterval(timer);
                }
                el.textContent = current + '+';
              }, 50);
            });
          }
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.reveal').forEach((el) => {
      revealObserver.observe(el);
    });

    return () => {
      revealObserver.disconnect();
    };
  }, []);

  return (
    <>
      <Global3DBackground />
      <CursorGlow />

      <Preloader />
      <Navbar
        loggedInUser={loggedInUser}
        onLogout={handleLogout}
        onLoginClick={() => setShowAuthModal(true)}
      />
      <Hero />

      <div className="stats-bar">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item reveal">
              <div className="stat-number" data-count="10">0</div>
              <div className="stat-label">Projects Built</div>
            </div>
            <div className="stat-item reveal reveal-delay-1">
              <div className="stat-number" data-count="2">0</div>
              <div className="stat-label">Years Experience</div>
            </div>
            <div className="stat-item reveal reveal-delay-2">
              <div className="stat-number" data-count="20">0</div>
              <div className="stat-label">Technologies</div>
            </div>
            <div className="stat-item reveal reveal-delay-3">
              <div className="stat-number" data-count="5">0</div>
              <div className="stat-label">Certifications</div>
            </div>
          </div>
        </div>
      </div>

      <About />
      <Skills />
      <Projects />
      <Experience />
      <Education />
      <Certifications />
      <Contact />
      <Footer />
      <Chatbot
        loggedInUser={loggedInUser}
        setLoggedInUser={setLoggedInUser}
        setShowAuthModal={setShowAuthModal}
      />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={setLoggedInUser}
      />
    </>
  );
}

export default App;
