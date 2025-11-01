import './FeatureCard.css';
import { motion } from 'framer-motion';

export default function FeatureCard({
  title,
  description,
  leftImage,
  rightImage,
  centerImage,
  content,
  reverse,
  variant = 'primary',
  hideFiguresOnSmall = false,
  layoutClass = '',
  sideText = null,
  topFigure,
  mediaFirst = false,
  topBody,
}) {
  return (
    <section className={`feature-card ${reverse ? 'reverse' : ''} ${hideFiguresOnSmall ? 'hide-figures-sm' : ''} ${layoutClass}`}>
      {topFigure && (
        <img className="top-figure" src={topFigure} alt="decor" />
      )}
      <div className={`feature-outer ${variant}`}>
        {topBody && (
          <img className="top-body" src={topBody} alt="decor-body" />
        )}
        {title && <h2 className="feature-title center">{title}</h2>}

        <motion.div
          className="feature-frame"
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          whileHover={{ scale: 1.01 }}
        >
          {leftImage && (
            <img className="figure figure-left" src={leftImage} alt="left" />
          )}

          <div className="feature-inner">
            {centerImage && sideText ? (
              <div className="feature-content two-col">
                {mediaFirst ? (
                  <>
                    <div className="feature-col feature-col-left">
                      <div className="media-surface">
                        <img className="feature-center-img" src={centerImage} alt="center" />
                      </div>
                    </div>
                    <div className="feature-col feature-col-right">
                      <div className="feature-text">{sideText}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="feature-col feature-col-left">
                      <div className="feature-text">{sideText}</div>
                    </div>
                    <div className="feature-col feature-col-right">
                      <div className="media-surface">
                        <img className="feature-center-img" src={centerImage} alt="center" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="feature-content">
                {centerImage ? (
                  <img className="feature-center-img" src={centerImage} alt="center" />
                ) : (
                  <div className="feature-text">
                    {content || (
                      <>
                        {description && <p className="feature-desc">{description}</p>}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

        </motion.div>
        {rightImage && (
          <img className="figure figure-right" src={rightImage} alt="right" />
        )}
      </div>
    </section>
  );
}
