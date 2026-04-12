/**
 * POST PDF to the dedicated AI summarize microservice (not the main Meetza API / video flow).
 * Base URL + API key live here only — keep separate from video summary env.
 */

const PDF_SUMMARY_BASE_URL = "http://127.0.0.1:8000".replace(/\/+$/, "");
const PDF_SUMMARY_API_KEY = "#$$0limaaaannnn##sddsdsd23233522dd";

export async function fetchPdfAsFile(fileUrl, fileNameHint = "document.pdf") {
  if (!fileUrl) throw new Error("Missing file URL");
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const res = await fetch(fileUrl, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Could not download PDF");
  const blob = await res.blob();
  let name = fileNameHint || "document.pdf";
  if (!name.toLowerCase().endsWith(".pdf")) {
    name = `${name.replace(/\.[^/.]+$/, "") || "document"}.pdf`;
  }
  return new File([blob], name, { type: blob.type || "application/pdf" });
}

function pickSummaryPayload(data) {
  if (!data || typeof data !== "object") return { summary: null, transcript: null };
  const root = data.data !== undefined && typeof data.data === "object" ? data.data : data;
  const summary =
    root.summary ??
    root.Summary ??
    root.text ??
    root.result ??
    root.message ??
    (typeof root === "string" ? root : null);
  const transcript = root.transcript ?? root.Transcript ?? root.transcription ?? null;
  return {
    summary: summary != null && summary !== "" ? String(summary) : null,
    transcript: transcript != null && transcript !== "" ? String(transcript) : null,
  };
}

/**
 * @param {File|Blob} file - PDF file
 * @returns {Promise<{ summary: string, transcript: string | null }>}
 */
export async function summarizePdfFile(file) {
  const formData = new FormData();
  const name = file instanceof File ? file.name : "document.pdf";
  formData.append("file", file, name.endsWith(".pdf") ? name : `${name}.pdf`);

  const headers = {
    "x-api-key": PDF_SUMMARY_API_KEY,
  };

  const res = await fetch(`${PDF_SUMMARY_BASE_URL}/summarize_pdf`, {
    method: "POST",
    headers,
    body: formData,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      (json && (json.message || json.detail || json.error)) ||
      text?.slice(0, 200) ||
      res.statusText ||
      "Request failed";
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  const { summary, transcript } = pickSummaryPayload(json ?? (text ? { summary: text } : {}));
  if (!summary) throw new Error("Invalid response from summarize service");

  let finalTranscript = transcript;
  if (finalTranscript && summary && finalTranscript.trim() === summary.trim()) {
    finalTranscript = null;
  }

  return {
    summary,
    transcript: finalTranscript,
  };
}

export async function summarizePdfFromUrl(fileUrl, fileNameHint) {
  const file = await fetchPdfAsFile(fileUrl, fileNameHint);
  return summarizePdfFile(file);
}
