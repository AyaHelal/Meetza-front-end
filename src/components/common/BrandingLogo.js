import React from 'react';
import { useBranding } from '../../context/BrandingContext';

const BrandingLogo = ({ 
  className = "", 
  style = {}, 
  fallbackSrc = "/assets/meetza.png",
  alt = "Company Logo",
  showSystemName = false,
  systemNameClassName = "",
  systemNameStyle = {}
}) => {
  const { logoUrl, systemName, systemNameColor, loading } = useBranding();

  // Only show loading state if we don't have a logoUrl or systemName yet
  if (loading && !logoUrl && systemName === 'Meetza') {
    return (
      <div className={`branding-logo-loading ${className}`} style={{ ...style, transform: 'none' }}>
        <img src={fallbackSrc} alt={alt} style={{ maxWidth: '100%', height: 'auto', transform: 'none' }} />
      </div>
    );
  }

  return (
    <div className={`branding-logo ${className}`} style={{ ...style, transform: 'none' }}>
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={alt} 
          style={{ maxWidth: '100%', height: 'auto', ...style, transform: 'none' }}
          onError={(e) => {
            e.target.src = fallbackSrc;
          }}
        />
      ) : (
        <img src={fallbackSrc} alt={alt} style={{ maxWidth: '100%', height: 'auto', ...style, transform: 'none' }} />
      )}
      {showSystemName && systemName && (
        <div className={`branding-system-name ${systemNameClassName}`} style={{ color: systemNameColor || '#2c3e50', ...systemNameStyle }}>
          {systemName}
        </div>
      )}
    </div>
  );
};

export default BrandingLogo;
