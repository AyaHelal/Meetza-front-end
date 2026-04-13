import api from "../../../API/axiosInstance";

function pickUserFromResponse(res) {
  const root = res?.data;
  const payload = root?.data ?? root?.user ?? root;
  return payload && typeof payload === "object" ? payload : null;
}

/**
 * PATCH /user/:id — partial JSON update (name, etc.). Photo uploads use multipart in {@link UserPhoto}.
 */
export async function patchUser(userId, body) {
  if (userId == null || String(userId).trim() === "") {
    throw new Error("Missing user id");
  }
  const res = await api.patch(`/user/${userId}`, body);
  return { res, patchPayload: pickUserFromResponse(res) };
}
