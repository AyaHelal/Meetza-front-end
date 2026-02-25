import { jwtDecode } from "jwt-decode";

/**
 * Reads the JWT token from localStorage (then sessionStorage) and decodes it.
 * Returns { id, email, role } from the token payload. No verification logic.
 * @returns {{ id, email, role } | null}
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
        };
    } catch {
        return null;
    }
}
