import React from "react";
import { useNavigate } from "react-router-dom";
import { CaretLeft, CheckCircle } from "@phosphor-icons/react";
import { useTheme } from "../../context/ThemeContext";
import "./AppearancePage.css";

const AppearancePage = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const themes = [
    {
      id: "light",
      name: "Light",
      preview: {
        bg: "#f4f6f8",
        sidebar: "#ffffff",
        message: "#0076ea",
        messageAlt: "#e0e0e0",
      },
    },
    {
      id: "dark",
      name: "Dark",
      preview: {
        bg: "#0f172a",
        sidebar: "#1e293b",
        message: "#3b82f6",
        messageAlt: "#334155",
      },
    },
    {
      id: "purple",
      name: "Purple",
      preview: {
        bg: "#f5f3ff",
        sidebar: "#ffffff",
        message: "#7c3aed",
        messageAlt: "#e5e7eb",
      },
    },
    {
      id: "warm",
      name: "Warm",
      preview: {
        bg: "#fff7ed",
        sidebar: "#ffffff",
        message: "#f97316",
        messageAlt: "#fed7aa",
      },
    },
  ];

  return (
    <div className="appearance-page flex-grow-1 min-vh-0">
      <div className="appearance-container">
        <header className="appearance-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <CaretLeft size={20} weight="bold" />
            <span>Back</span>
          </button>
          <div className="header-content">
            <h1>Appearance</h1>
            <p>Choose how the app looks and feels.</p>
          </div>
        </header>

        <section className="theme-section">
          <h2 className="section-title">THEME</h2>
          <div className="theme-grid">
            {themes.map((t) => (
              <div
                key={t.id}
                className={`theme-card ${theme === t.id ? "active" : ""}`}
                onClick={() => setTheme(t.id)}
              >
                <div className="theme-preview" style={{ backgroundColor: t.preview.bg }}>
                  <div className="preview-layout">
                    <div className="preview-sidebar" style={{ backgroundColor: t.preview.sidebar }}>
                        <div className="preview-line" style={{ width: '40%' }}></div>
                        <div className="preview-line" style={{ width: '60%' }}></div>
                        <div className="preview-line" style={{ width: '50%' }}></div>
                    </div>
                    <div className="preview-content">
                        <div className="preview-header">
                             <div className="preview-line" style={{ width: '30%' }}></div>
                             <div className="preview-line" style={{ width: '50%' }}></div>
                        </div>
                        <div className="preview-chat">
                            <div className="preview-bubble right" style={{ backgroundColor: t.preview.message }}></div>
                            <div className="preview-bubble right" style={{ backgroundColor: t.preview.message, width: '40%' }}></div>
                            <div className="preview-bubble left" style={{ backgroundColor: t.preview.messageAlt }}></div>
                        </div>
                    </div>
                  </div>
                </div>
                <div className="theme-info">
                  <span className="theme-name">{t.name}</span>
                  {theme === t.id && (
                    <CheckCircle size={24} weight="fill" className="check-icon" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AppearancePage;
