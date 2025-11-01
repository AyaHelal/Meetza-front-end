import { useContext } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Footer from "../../components/Footer/Footer";
import FeatureCard from "../../components/FeatureCard/FeatureCard";
import "./Landing.css";

const Landing = () => {
  const navigate = useNavigate();
  const { logoutUser } = useContext(AuthContext);

  const handleLogout = () => {
    logoutUser();
    navigate('/login', { replace: true });
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut', delay: i * 0.12 },
    }),
  };

  // Slide-in by direction: pass 1 to come from right, -1 from left
  const slideIn = {
    hidden: (dir = 1) => ({ opacity: 0, x: dir * 60 }),
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  return (
    <div
      className="landing-root landing-root-padding"
      style={{
        backgroundImage: 'url(/assets/background.png), url(/assets/background.png), url(/assets/background.png)',
        backgroundRepeat: 'repeat, no-repeat, no-repeat',
        backgroundSize: 'cover, cover, cover',
        backgroundPosition: 'top center, center center, bottom center',
      }}
    >
      <main className="landing-content">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="page-block"
          style={{ padding: 20 }}
        >
          <button onClick={handleLogout} className="btn btn-outline-danger mt-3">Logout</button>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={slideIn}
          custom={1} // from right
          className="bg-section-inner page-block"
        >
          {/* Card 1: Video sessions left, text right */}
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

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={slideIn}
          custom={-1} // from left
          className="bg-section-inner page-block"
        >
          {/* Card 2: Text left, media right (per-card layout) */}
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
      </main>

      <Footer/>
    </div>
  );
};

export default Landing;
