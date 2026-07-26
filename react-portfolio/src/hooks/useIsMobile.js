import { useState, useEffect } from 'react';

export const useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth <= breakpoint || ('ontouchstart' in window && window.innerWidth <= 1024);
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const checkMobile = () => {
            const mobileState = window.innerWidth <= breakpoint || ('ontouchstart' in window && window.innerWidth <= 1024);
            setIsMobile(mobileState);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [breakpoint]);

    return isMobile;
};

export default useIsMobile;
