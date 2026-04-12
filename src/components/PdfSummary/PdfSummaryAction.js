import React, { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Lottie from "lottie-react";
import { Spinner } from "@phosphor-icons/react";
import aiAnimation from "../../lottie/AI.json";
import { smartToast } from "../../API/toastManager";
import { summarizePdfFromUrl } from "../../services/pdfSummaryService";
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
  const cardRef = useRef(null);
  const dragMeta = useRef({ startX: 0, startY: 0, origLeft: 0, origTop: 0 });

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
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!fileUrl) {
        smartToast.error("PDF link is missing.");
        return;
      }
      setLoading(true);
      try {
        const { summary, transcript } = await summarizePdfFromUrl(fileUrl, fileName || "document.pdf");
        setSummaryData({
          summary: summary || "No summary available",
          transcript: transcript || null,
        });
        setShowSummary(true);
        smartToast.success("Summary generated successfully!");
      } catch (err) {
        const msg = err?.message || "Failed to generate summary";
        smartToast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [fileUrl, fileName]
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
                {summaryData.transcript ? (
                  <div className="video-ai-summary-transcript">
                    <h4>Transcript</h4>
                    <p>{summaryData.transcript}</p>
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
      <button
        type="button"
        className={`pdf-summary-trigger ${triggerClassName}`.trim()}
        onClick={runSummarize}
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
      {panel}
    </>
  );
}
