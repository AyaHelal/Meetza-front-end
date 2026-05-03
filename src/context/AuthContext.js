import { createContext, useState, useEffect, useContext } from "react";
import { extractUserFromToken } from "../utils/token";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [initializing, setInitializing] = useState(true);
    const [isRemembered, setIsRemembered] = useState(false);

    // On app startup: read token from storage and set user from token (reactive source)
    useEffect(() => {
        try {
            let storedToken = localStorage.getItem("token");
            const rememberFlag = localStorage.getItem("remember");
            const loginTime = localStorage.getItem("loginTime");

            if (!storedToken) storedToken = sessionStorage.getItem("token");

            if (storedToken) {
                const rememberedInLocal = rememberFlag === "true";
                if (rememberedInLocal && loginTime) {
                    const currentTime = new Date().getTime();
                    const storedTime = parseInt(loginTime, 10);
                    const twentyFourHours = 24 * 60 * 60 * 1000;
                    if (currentTime - storedTime > twentyFourHours) {
                        localStorage.removeItem("user");
                        localStorage.removeItem("token");
                        localStorage.removeItem("remember");
                        localStorage.removeItem("loginTime");
                        sessionStorage.removeItem("user");
                        sessionStorage.removeItem("token");
                        setInitializing(false);
                        return;
                    }
                }

                const userFromToken = extractUserFromToken();
                if (userFromToken && (userFromToken.id || userFromToken.email)) {
                    let storedUser = null;
                    try {
                        const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
                        if (raw) storedUser = JSON.parse(raw);
                    } catch (_) {}
                    // Prefer stored user (session/local) so token data does not override name, photo, etc.
                    setUser({ ...userFromToken, ...storedUser });
                    setToken(storedToken);
                }
                setIsRemembered(rememberedInLocal);
            }
        } catch (error) {
            console.error("❌ Error initializing auth:", error);
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            sessionStorage.removeItem("user");
            sessionStorage.removeItem("token");
            setIsRemembered(false);
        }
        setInitializing(false);
    }, []);

    const loginUser = (userData, userToken, rememberMe = false) => {
        try {
            if (rememberMe) {
                if (userData) localStorage.setItem("user", JSON.stringify(userData));
                else localStorage.removeItem("user");
                localStorage.setItem("token", userToken);
                localStorage.setItem("remember", "true");
                sessionStorage.removeItem("user");
                sessionStorage.removeItem("token");
                setIsRemembered(true);
            } else {
                if (userData) sessionStorage.setItem("user", JSON.stringify(userData));
                else sessionStorage.removeItem("user");
                sessionStorage.setItem("token", userToken);
                localStorage.removeItem("user");
                localStorage.removeItem("token");
                localStorage.setItem("remember", "false");
                setIsRemembered(false);
            }
            setToken(userToken);
            // Prefer API user (name, photo, etc.) so token data does not override what we store
            const userFromToken = extractUserFromToken();
            if (userFromToken && (userFromToken.id || userFromToken.email)) {
                setUser({ ...userFromToken, ...userData });
            } else {
                setUser(userData || null);
            }
        } catch (error) {
            console.error("❌ Failed to save user/token:", error);
        }
    };

    /** Clear all auth + app cache from localStorage & sessionStorage (e.g. old/corrupt data) */
    const clearAuthStorage = () => {
        try {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            localStorage.removeItem("remember");
            localStorage.removeItem("loginTime");
            sessionStorage.removeItem("user");
            sessionStorage.removeItem("token");
            const keysToRemove = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && (key.startsWith("meeting_") || key.startsWith("meetza_"))) keysToRemove.push(key);
            }
            keysToRemove.forEach((k) => sessionStorage.removeItem(k));
        } catch (e) {
        }
    };

    const logoutUser = () => {
        setUser(null);
        setToken(null);
        clearAuthStorage();
        setIsRemembered(false);
    };

    const value = {
        user,
        setUser,
        token,
        initializing,
        isRemembered,
        loginUser,
        logoutUser,
        clearAuthStorage,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
