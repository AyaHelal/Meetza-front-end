import { jwtDecode } from "jwt-decode";

/**
 * Reads the JWT token from localStorage (then sessionStorage) and decodes it.
 * Returns { id, email, role, name, photo } from the token payload. No verification logic.
 * @returns {{ id, email, role, name?, photo? } | null}
 */
export function extractUserFromToken() {
    try {
        let token = localStorage.getItem("token");
        if (!token) token = sessionStorage.getItem("token");
        if (!token) return null;

        const payload = jwtDecode(token);
        return {
            id: payload.id ?? payload.sub ?? null,
            email: payload.email ?? null,
            role: payload.role ?? null,
            name: payload.name ?? payload.full_name ?? payload.user_name ?? payload.username ?? null,
            photo: payload.photo ?? payload.picture ?? payload.avatar ?? payload.image ?? payload.user_photo ?? payload.profile_image ?? null,
        };
    } catch {
        return null;
    }
}
