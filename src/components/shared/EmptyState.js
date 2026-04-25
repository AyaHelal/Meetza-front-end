import React from "react";
import { Button } from "react-bootstrap";
import Lottie from "lottie-react";
import "./EmptyState.css";

export function EmptyState({
  icon: Icon,
  lottieData,
  lottieStyle,
  title,
  description,
  buttonLabel,
  onButtonClick,
  variant = "default",
  iconColor,
  iconBg,
  className = "",
}) {
  const defaultLottieStyle = { maxHeight: 140 };
  const finalLottieStyle = lottieStyle || defaultLottieStyle;

  return (
    <div className={`empty-state-container empty-state--${variant} d-flex flex-column align-items-center text-center ${className}`}>
      {lottieData ? (
        <div className="empty-state-lottie-wrapper">
          <Lottie animationData={lottieData} loop style={finalLottieStyle} />
        </div>
      ) : (
        <div className="empty-state-icon-wrapper" style={{ backgroundColor: iconBg }}>
          {Icon && <Icon size={28} weight="regular" color={iconColor} />}
        </div>
      )}
      <h3 className="empty-state-title mb-1">{title}</h3>
      <p className="empty-state-desc mb-3">{description}</p>
      {buttonLabel && (
        <Button
          variant={variant === "inverted" ? "outline-light" : "outline-primary"}
          size="sm"
          className="empty-state-btn rounded-pill"
          onClick={onButtonClick}
        >
          {buttonLabel}
        </Button>
      )}
    </div>
  );
}
