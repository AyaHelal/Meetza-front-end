import { getAllVideos, mapVideoToSession } from "../../VideoSessions/services/allVideosService";
import { getVideoDetail } from "../../VideoSessions/services";

function coerceBoolean(v) {
  if (v === true) return true;
  if (v === false) return false;
  if (v == null) return null;
  if (typeof v === "number") return v === 1;
  const s = String(v).toLowerCase().trim();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return null;
}

async function mapSavedByDetails(videos) {
  // Fallback when /video list doesn't include user saved flags.
  // Uses getVideoDetail for each video id and keeps only saved ones.
  const results = await Promise.all(
    videos.map(async (v) => {
      const detail = await getVideoDetail(v.id);
      const isSaved = coerceBoolean(detail?.is_saved ?? detail?.saved ?? detail?.saved_count ?? null);
      return { video: v, isSaved: isSaved === true };
    })
  );
  return results.filter((r) => r.isSaved).map((r) => r.video);
}

export async function getSavedVideos() {
  const raw = await getAllVideos();
  const sessions = (raw || []).map(mapVideoToSession);

  // Try to use any saved flag present in list response (best case).
  const hasSavedField = raw?.some(
    (r) => r && (r.is_saved !== undefined || r.isSaved !== undefined || r.saved !== undefined)
  );

  if (hasSavedField) {
    const byId = new Map(
      (raw || []).map((r) => [String(r?.id ?? r?.video_id ?? ""), r])
    );
    const saved = sessions.filter((s) => {
      const r = byId.get(String(s?.id ?? ""));
      const isSaved =
        coerceBoolean(r?.is_saved ?? r?.isSaved ?? r?.saved) ?? false;
      return isSaved === true;
    });
    return saved;
  }

  // Fallback: fetch per-video details.
  return mapSavedByDetails(sessions);
}

