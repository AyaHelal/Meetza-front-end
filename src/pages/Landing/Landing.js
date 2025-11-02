import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Footer from "../../components/Footer/Footer";
import HeroSection from "../../components/Landing/HeroSection";
import MessagingCardSlider from "../../components/Landing/MessagingCardSlider";
import FeatureCard from "../../components/FeatureCard/FeatureCard";
import "./Landing.css";

const Landing = () => {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Slide-in by direction: pass 1 to come from right, -1 from left
  const slideIn = {
    hidden: (dir = 1) => ({ opacity: 0, x: dir * 60 }),
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  return (
    <>
      <div className="landing-root landing-root-padding">
      <main className="landing-content">
        <HeroSection />

        {/* Single continuous background from after HeroSection to page end */}
        <div
          style={{
            backgroundImage: 'url(/assets/background.png)',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'top center',
          }}
        >
          {/* Card 1 */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={slideIn}
            custom={1} // from right
            className="bg-section-inner page-block"
          >
            <FeatureCard
              reverse={false}
              centerImage="/assets/vedioSession.png"
              variant="tertiary"
              layoutClass="layout-video"
              mediaFirst={true}
              topFigure="/assets/robotFace1.png"
              topBody="/assets/robotBody1.png"
              sideText={(
                <>
                  <h2>Lorem ipsum enim sit nisl</h2>
                  <p>
                    Lorem Ipsum Dolor Sit Amet Consectetur. Eleifend Arcu Auctor Placerat In Feugiat
                    Risus Pretium. Nibh In Pulvinar Vitae Tristique. Lobortis Massa At Sagittis In
                    Ultrices Fames Massa Vulputate Ante. Eget Nisl Elementum Dictum Nisi Ullamcorper.
                  </p>
                </>
              )}
            />
          </motion.div>

          {/* Messaging slider after first card */}
          <div className="page-block">
            <MessagingCardSlider />
          </div>

          {/* Card 2 */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={slideIn}
            custom={-1} // from left
            className="bg-section-inner page-block"
          >
            <FeatureCard
              reverse={false}
              centerImage="/assets/boyWithlabtop.png"
              variant="secondary"
              layoutClass="layout-boy"
              topFigure="/assets/robot2.png"
              sideText={(
                <>
                  <h2>Lorem ipsum enim sit nisl</h2>
                  <p>
                    Lorem Ipsum Dolor Sit Amet Consectetur. Eleifend Arcu Auctor Placerat In Feugiat
                    Risus Pretium. Nibh In Pulvinar Vitae Tristique. Lobortis Massa At Sagittis In
                    Ultrices Fames Massa Vulputate Ante. Eget Nisl Elementum Dictum Nisi Ullamcorper.
                  </p>
                </>
              )}
            />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={slideIn}
            custom={1} // from right
            className="bg-section-inner page-block"
          >
            {/* Card 3: Calendar between two boys */}
            <FeatureCard
              title="Lorem ipsum enim sit nisl"
              leftImage="/assets/boy2.png"
              rightImage="/assets/boy1.png"
              centerImage="/assets/calender.png"
              variant="primary"
              hideFiguresOnSmall={true}
            />
          </motion.div>
          <Footer/>
        </div>
      </main>
      {showTop && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
        >
          ↑
        </motion.button>
      )}
    </div>
    </>
  );
};

export default Landing;
