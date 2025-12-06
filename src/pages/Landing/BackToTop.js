import { useState, useEffect, useRef } from 'react';

const BackToTop = () => {
    const [isVisible, setIsVisible] = useState(false);
    const rafIdRef = useRef(null);

    useEffect(() => {
        const checkScroll = () => {
            // Try multiple ways to get scroll position
            const scrollTop = window.pageYOffset || 
                            window.scrollY ||
                            document.documentElement.scrollTop || 
                            document.body.scrollTop || 
                            0;
            
            // Show button when user scrolls down more than 300px
            const shouldShow = scrollTop > 300;
            setIsVisible(shouldShow);
            
            // Continue checking
            rafIdRef.current = requestAnimationFrame(checkScroll);
        };

        // Start checking scroll position
        rafIdRef.current = requestAnimationFrame(checkScroll);

        // Also add scroll event listener as backup
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || 
                            window.scrollY ||
                            document.documentElement.scrollTop || 
                            document.body.scrollTop || 
                            0;
            const shouldShow = scrollTop > 300;
            setIsVisible(shouldShow);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        document.addEventListener('scroll', handleScroll, { passive: true });

        // Cleanup
        return () => {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
            }
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('scroll', handleScroll);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleScrollTop = () => {
        // Try multiple methods to ensure scrolling works
        if (window.scrollTo) {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: "smooth"
            });
        }
        
        // Also try document scrolling
        if (document.documentElement) {
            document.documentElement.scrollTo({
                top: 0,
                left: 0,
                behavior: "smooth"
            });
        }
        
        if (document.body) {
            document.body.scrollTo({
                top: 0,
                left: 0,
                behavior: "smooth"
            });
        }
        
        // Fallback for older browsers
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    };

    return (
        <button
            className={`back-to-top ${isVisible ? 'visible' : 'hidden'}`}
            onClick={handleScrollTop}
            aria-label="Back to top"
            style={{
                display: 'flex',
                opacity: isVisible ? 1 : 0,
                visibility: isVisible ? 'visible' : 'hidden',
                pointerEvents: isVisible ? 'auto' : 'none',
                position: 'fixed',
                right: '20px',
                bottom: '24px',
                zIndex: 2147483647,
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#00dc85',
                color: '#fff',
                fontSize: '20px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 10px 24px rgba(0,0,0,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 0.3s ease, visibility 0.3s ease'
            }}
        >
            ↑
        </button>
    );
};

export default BackToTop;
