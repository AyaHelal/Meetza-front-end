import { motion } from 'framer-motion';
import Footer from "../../components/Footer/Footer";
import HeroSection from "../../components/Landing/HeroSection";
import MessagingCardSlider from "../../components/Landing/MessagingCardSlider";
import FeatureCard from "../../components/FeatureCard/FeatureCard";
import "./Landing.css";
import BackToTop from './BackToTop';

const Landing = () => {


  const slideIn = {
    hidden: (dir = 1) => ({ opacity: 0, x: dir * 60 }),
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  return (
    <>
      <div className="landing-root landing-root-padding">
        <main className="landing-content">

          <HeroSection />

          {/* Background covering whole content area */}
          <div
            className="landing-background"
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
              custom={1}
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
                    <h2>Secure Video Meetings</h2>
                    <p>
                      Start secure video meetings instantly with your team or patients. Share screens, record sessions, and manage consultations efficiently.
                    </p>
                    <ul>
                      <li>HD Video & Audio</li>
                      <li>Screen Sharing & Recording</li>
                      <li>Meeting Notes & Summaries</li>
                    </ul>

                  </>
                )}
              />
            </motion.div>

            {/* Messaging slider */}
            <div className="page-block">
              <MessagingCardSlider />
            </div>

            {/* Card 2 */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={slideIn}
              custom={-1}
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
                    <h2>Real-Time Group Chat</h2>
                    <p>
                      Collaborate in real-time with doctors and members. Create group discussions, send files, and stay updated instantly.
                    </p>
                    <ul>
                      <li>Private & Group Chats</li>
                      <li>File Sharing & Attachments</li>
                      <li>Notifications & Pop-ups</li>
                    </ul>

                  </>
                )}
              />
            </motion.div>

            {/* Card 3 */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={slideIn}
              custom={1}
              className="bg-section-inner page-block"
            >
              <FeatureCard
                title="Meeting Schedule"
                leftImage="/assets/boy2.png"
                rightImage="/assets/boy1.png"
                centerImage="/assets/calender.png"
                variant="primary"
                hideFiguresOnSmall={true}
              />
            </motion.div>

            <Footer />
          </div>
        </main>
      </div>
      <BackToTop />
    </>
  );
};

export default Landing;
