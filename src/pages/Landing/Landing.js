import { motion } from 'framer-motion';
import Footer from "../../components/Footer/Footer";
import HeroSection from "../../components/Landing/HeroSection";
import MessagingCardSlider from "../../components/Landing/MessagingCardSlider";
import FeatureCard from "../../components/FeatureCard/FeatureCard";
import ContactSection from "../../components/Landing/ContactSection";
import SupportSection from "../../components/Landing/SupportSection";
import CareersSection from "../../components/Landing/CareersSection";
import "./Landing.css";
import BackToTop from './BackToTop';
import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const Landing = () => {
  const location = useLocation();
  const navigationType = useNavigationType();


  const slideIn = {
    hidden: (dir = 1) => ({ opacity: 0, x: dir * 60 }),
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  useEffect(() => {
    const hash = (location.hash || "").replace("#", "");
    if (!hash) return;

    // Avoid jumping on initial load/reload/back-forward.
    // Only auto-scroll when navigation happened inside the app (e.g., navbar clicks).
    if (navigationType === "POP") return;

    const t = setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);

    return () => clearTimeout(t);
  }, [location.hash, navigationType]);

  return (
    <>
      <div
        className="landing-root landing-root-padding"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(33, 74, 184, 0.92) 0%, rgba(0, 220, 133, 0.25) 55%, rgba(33, 74, 184, 0.92) 100%), url(/assets/background-farida%202.png)",
          backgroundRepeat: "no-repeat, no-repeat",
          backgroundSize: "cover, cover",
          backgroundPosition: "top center, top center",
          backgroundAttachment: "fixed",
        }}
      >
        <main className="landing-content">

          <HeroSection />

          {/* Background covering whole content area */}
          <div
            className="landing-background"
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
              <section id="landing-secure-video-meetings">
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
              </section>
            </motion.div>

            {/* Messaging slider */}
            <div id="landing-video-sessions" className="page-block">
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
              <section id="landing-real-time-chat">
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
              </section>
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
              <section id="landing-meeting-schedule">
                <FeatureCard
                  title="Meeting Schedule"
                  leftImage="/assets/boy2.png"
                  rightImage="/assets/boy1.png"
                  centerImage="/assets/calender.png"
                  variant="primary"
                  hideFiguresOnSmall={true}
                />
              </section>
            </motion.div>

            <div className="page-block">
              <SupportSection />
            </div>

            <div className="page-block">
              <CareersSection />
            </div>

            {/* Contact Section */}
            <div id="contact-section" className="page-block">
              <ContactSection />
            </div>

            <Footer />
          </div>
        </main>
      </div>
      <BackToTop />
    </>
  );
};

export default Landing;
