import React, { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Lottie from "lottie-react";
import { Spinner } from "@phosphor-icons/react";
import aiAnimation from "../../lottie/AI.json";
import { smartToast } from "../../API/toastManager";
import { getPdfSummaryFromGroupContents } from "../../pages/GroupChat/services/groupChatService";
import api from "../../API/axiosInstance";
import "./PdfSummaryAction.css";

export default function PdfSummaryAction({
  fileUrl,
  fileName,
  triggerClassName = "",
  triggerLottieSize = 20,
}) {
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  /** null = default corner layout from CSS; set when user drags the card */
  const [cardPos, setCardPos] = useState(null);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const cardRef = useRef(null);
  const dropdownRef = useRef(null);
  const dragMeta = useRef({ startX: 0, startY: 0, origLeft: 0, origTop: 0 });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showSummary) {
      setCardPos(null);
      setIsDraggingCard(false);
    }
  }, [showSummary]);

  const onSummaryHeaderPointerDown = useCallback((e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.target.closest(".video-ai-summary-close")) return;
    const el = cardRef.current;
    if (!el) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    dragMeta.current = {
      startX: e.clientX,
      startY: e.clientY,
      origLeft: rect.left,
      origTop: rect.top,
    };
    setCardPos({ left: rect.left, top: rect.top });
    setIsDraggingCard(true);

    const clamp = (left, top) => {
      const node = cardRef.current;
      if (!node) return { left, top };
      const w = node.offsetWidth;
      const h = node.offsetHeight;
      const pad = 8;
      const maxL = Math.max(pad, window.innerWidth - w - pad);
      const maxT = Math.max(pad, window.innerHeight - h - pad);
      return {
        left: Math.min(Math.max(pad, left), maxL),
        top: Math.min(Math.max(pad, top), maxT),
      };
    };

    const onMove = (ev) => {
      const { startX, startY, origLeft, origTop } = dragMeta.current;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setCardPos(clamp(origLeft + dx, origTop + dy));
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      setIsDraggingCard(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, []);

  const runSummarize = useCallback(
    async (lang = "en") => {
      if (!fileUrl) {
        smartToast.error("PDF link is missing.");
        return;
      }
      setLoading(true);
      setShowLangDropdown(false);
      try {
        const { summary, topics } = await getPdfSummaryFromGroupContents(api, fileUrl, lang);
        setSummaryData({
          summary: summary || "No summary available",
          topics: topics || null,
        });
        setShowSummary(true);
        smartToast.success("Summary loaded successfully!");
      } catch (err) {
        const msg = err?.message || "Failed to load summary";
        smartToast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [fileUrl]
  );

  const panel =
    showSummary && summaryData
      ? createPortal(
          <div
            className={`pdf-summary-action${isDraggingCard ? " pdf-summary-action--dragging" : ""}`.trim()}
            aria-live="polite"
          >
            <div
              ref={cardRef}
              className={`video-ai-summary${cardPos ? " video-ai-summary--user-positioned" : ""}`.trim()}
              style={
                cardPos
                  ? {
                      left: cardPos.left,
                      top: cardPos.top,
                      right: "auto",
                      bottom: "auto",
                    }
                  : undefined
              }
            >
              <div className="video-ai-summary-header" onPointerDown={onSummaryHeaderPointerDown}>
                <div className="video-ai-summary-icon">
                  <Lottie animationData={aiAnimation} style={{ width: 30, height: 30 }} />
                  <span>AI Summary</span>
                </div>
                <button
                  type="button"
                  className="video-ai-summary-close"
                  onClick={() => setShowSummary(false)}
                  aria-label="Close AI Summary"
                >
                  ✕
                </button>
              </div>
              <div className="video-ai-summary-content">
                {summaryData.topics && summaryData.topics.length > 0 ? (
                  <div className="video-ai-summary-topics">
                    <h4>Topics</h4>
                    <ul>
                      {summaryData.topics.map((topic, idx) => (
                        <li key={idx}>{topic}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="video-ai-summary-summary">
                  <h4>Summary</h4>
                  <p>{summaryData.summary}</p>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        className={`pdf-summary-wrap ${triggerClassName}`.trim()}
        ref={dropdownRef}
      >
        <button
          type="button"
          className="pdf-summary-trigger"
          onClick={() => !loading && setShowLangDropdown(!showLangDropdown)}
          disabled={loading}
          title={loading ? "Generating summary…" : "AI PDF summary"}
          aria-label="Summarize PDF"
        >
          {loading ? (
            <Spinner
              size={Math.max(14, Math.round(triggerLottieSize * 0.9))}
              className="pdf-summary-trigger__spinner"
            />
          ) : (
            <Lottie
              animationData={aiAnimation}
              style={{ width: triggerLottieSize, height: triggerLottieSize }}
              loop
            />
          )}
        </button>

        {showLangDropdown && (
          <div className="pdf-language-options">
            <button
              className="pdf-language-option"
              onClick={() => runSummarize("en")}
              disabled={loading}
            >
              English
            </button>
            <button
              className="pdf-language-option"
              onClick={() => runSummarize("ar")}
              disabled={loading}
            >
              Arabic
            </button>
          </div>
        )}
      </div>
      {panel}
    </>
  );
}
