import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import chatAnimation from '../../lottie/Chat.json';
import bookAppointmentAnimation from '../../lottie/BookAppointmentAnimation.json';
import animatedPlayButton from '../../lottie/AnimatedPlayButton.json';
import videoConferencingGIF from '../../lottie/VideoConferencingGIF.json';
import contentManager from '../../lottie/ContentManager.json';
import 'bootstrap/dist/css/bootstrap.min.css';
import './MessagingCardSlider.css';

export default function MessagingCardSlider() {
    const [slidePosition, setSlidePosition] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    // Detect mobile screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const cards = [
        {
            title: "Start Your Own Meeting",
            description: "Host a meeting for your team in just a few clicks and share the link instantly.",
            image: "/assets/card2_image.png",
            lottie: videoConferencingGIF
        },
        {
            title: "Record & Save",
            description: "Record your meetings and keep them safely in your Videos library",
            image: "/assets/card3_image.png",
            lottie: animatedPlayButton
        },
        {
            title: "Real-time Chat",
            description: "Stay connected with team members through instant group chat.",
            image: "/assets/card_image.png",
            lottie: chatAnimation
        },
        {
            title: "Plan Ahead",
            description: "Schedule upcoming sessions and get reminders before they start.",
            image: "/assets/card4_image.png",
            lottie: bookAppointmentAnimation
        },
        {
            title: "Work Together",
            description: "Share ideas, documents, and build progress with your team.",
            image: "/assets/card5_image.png",
            lottie: contentManager
        }
    ];

    const cardsPerView = isMobile ? 2 : 3;
    const cardWidth = 100 / cardsPerView;
    const halfCardOffset = cardWidth / 2;
    const totalCards = cards.length;

    const duplicatedCards = [...cards, ...cards, ...cards];
    const startIndex = totalCards;

    const actualPosition = startIndex + slidePosition;

    useEffect(() => {
        if (slidePosition >= totalCards) {
            const timer = setTimeout(() => {
                setIsTransitioning(false);
                setSlidePosition(prev => prev - totalCards);
                setTimeout(() => setIsTransitioning(true), 10);
            }, 500);
            return () => clearTimeout(timer);
        } else if (slidePosition < 0) {
            const timer = setTimeout(() => {
                setIsTransitioning(false);
                setSlidePosition(prev => prev + totalCards);
                setTimeout(() => setIsTransitioning(true), 10);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [slidePosition, totalCards]);

    const nextSlide = () => {
        setIsTransitioning(true);
        setSlidePosition(prev => prev + 1);
    };

    const prevSlide = () => {
        setIsTransitioning(true);
        setSlidePosition(prev => prev - 1);
    };

    // Minimum swipe distance (in pixels)
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            nextSlide();
        }
        if (isRightSwipe) {
            prevSlide();
        }
    };

    return (
        <div className="messaging-card-slider-container" style={{
            minHeight: 'auto',
            padding: isMobile ? '20px 15px' : '32px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div className="container" style={{ maxWidth: '1400px' }}>
                <div style={{ position: 'relative' }}>
                    {/* Slider Container */}
                    <div style={{
                        padding: isMobile ? '12px 0' : '12px 0',
                        position: 'relative'
                    }}>
                        <div
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                            style={{
                                display: 'flex',
                                transition: isTransitioning ? 'transform 0.5s ease-in-out' : 'none',
                                transform: `translateX(calc(-${halfCardOffset}% - ${actualPosition * cardWidth}%))`,
                                touchAction: 'pan-x'
                            }}
                        >
                            {duplicatedCards.map((card, index) => {
                                const cardPosition = index - actualPosition;
                                const absPosition = Math.abs(cardPosition);
                                const offsetY = absPosition % 2 === 1 ? (isMobile ? 14 : 18) : 0; // Odd positions higher, even positions at base
                                const isLargeCard = card.title === "Start Your Own Meeting" || card.title === "Work Together";
                                const minHeightValue = isLargeCard ? (isMobile ? '140px' : '180px') : (isMobile ? '120px' : '140px');

                                return (
                                    <div key={index} style={{
                                        flex: `0 0 ${cardWidth}%`,
                                        padding: isMobile ? '0 10px' : '0 15px',
                                        boxSizing: 'border-box',
                                        minWidth: '0',
                                        transform: `translateY(${offsetY}px)`,
                                        transition: isTransitioning ? 'transform 0.5s ease-in-out' : 'none',
                                        zIndex: Math.abs(cardPosition) <= (isMobile ? 1 : 2) ? (isMobile ? 10 - Math.abs(cardPosition) : 10 - Math.abs(cardPosition)) : 1
                                    }}>
                                        <div style={{
                                            background: 'linear-gradient(135deg, #214AB8 0%, #00DC85 100%)',
                                            borderRadius: isMobile ? '24px' : '32px',
                                            padding: isMobile ? '14px' : '20px',
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.3), 0 5px 15px rgba(0,0,0,0.2)',
                                            transition: 'box-shadow 0.3s ease',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            height: isMobile ? '280px' : '520px'
                                        }}>
                                            {/* Image Container */}
                                            <div style={{
                                                borderRadius: isMobile ? '12px' : '15px',
                                                marginBottom: isMobile ? '10px' : '16px',
                                                overflow: 'hidden',
                                                minHeight: minHeightValue,
                                                position: 'relative',
                                                flex: '1 1 auto'
                                            }}>
                                                {card.lottie ? (
                                                    <Lottie
                                                        animationData={card.lottie}
                                                        loop
                                                        autoplay
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                            display: 'block'
                                                        }}
                                                    />
                                                ) : (
                                                    <img
                                                        src={card.image}
                                                        alt={card.title}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                            display: 'block'
                                                        }}
                                                    />
                                                )}
                                            </div>

                                            {/* Card Content */}
                                            <h5 style={{
                                                color: '#FFFFFF',
                                                marginBottom: isMobile ? '8px' : '2px',
                                                fontWeight: '600',
                                                fontSize: isMobile ? '16px' : '32px'
                                            }}>
                                                {card.title}
                                            </h5>
                                            <p style={{
                                                color: '#FFFFFF',
                                                marginBottom: '0',
                                                fontSize: isMobile ? '12px' : '24px',
                                                lineHeight: isMobile ? '1.3' : '1.5'
                                            }}>
                                                {card.description}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Navigation Arrows */}
                    <button
                        onClick={prevSlide}
                        className="slider-nav-btn slider-nav-prev"
                        style={{
                            position: 'absolute',
                            left: isMobile ? '10px' : '-60px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: isMobile ? '40px' : '50px',
                            height: isMobile ? '40px' : '50px',
                            fontSize: isMobile ? '20px' : '24px',
                            cursor: 'pointer',
                            opacity: 1,
                            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#3498db',
                            transition: 'all 0.3s ease',
                            zIndex: 100
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-50%) scale(1.1)';
                            e.target.style.background = '#3498db';
                            e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(-50%) scale(1)';
                            e.target.style.background = 'white';
                            e.target.style.color = '#3498db';
                        }}
                    >
                        ‹
                    </button>

                    <button
                        onClick={nextSlide}
                        className="slider-nav-btn slider-nav-next"
                        style={{
                            position: 'absolute',
                            right: isMobile ? '10px' : '-60px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: isMobile ? '40px' : '50px',
                            height: isMobile ? '40px' : '50px',
                            fontSize: isMobile ? '20px' : '24px',
                            cursor: 'pointer',
                            opacity: 1,
                            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#3498db',
                            transition: 'all 0.3s ease',
                            zIndex: 100
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-50%) scale(1.1)';
                            e.target.style.background = '#3498db';
                            e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(-50%) scale(1)';
                            e.target.style.background = 'white';
                            e.target.style.color = '#3498db';
                        }}
                    >
                        ›
                    </button>
                </div>
            </div>
        </div>
    );
}