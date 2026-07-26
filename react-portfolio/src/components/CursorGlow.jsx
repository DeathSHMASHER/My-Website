import { useEffect, useRef } from 'react';
import useIsMobile from '../hooks/useIsMobile';

const CursorGlow = () => {
    const glowRef = useRef(null);
    const isMobile = useIsMobile(768);

    useEffect(() => {
        if (isMobile) return;
        const glow = glowRef.current;
        if (!glow) return;

        let mx = window.innerWidth / 2;
        let my = window.innerHeight / 2;
        let gx = mx;
        let gy = my;
        let animationFrameId;

        const onMouseMove = (e) => {
            mx = e.clientX;
            my = e.clientY;
        };

        document.addEventListener('mousemove', onMouseMove);

        const animate = () => {
            gx += (mx - gx) * 0.08;
            gy += (my - gy) * 0.08;
            glow.style.left = `${gx}px`;
            glow.style.top = `${gy}px`;
            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isMobile]);

    if (isMobile) return null;

    return <div className="cursor-glow active" ref={glowRef} id="cursorGlow" />;
};

export default CursorGlow;
