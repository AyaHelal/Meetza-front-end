import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [initializing, setInitializing] = useState(true);
    const [isRemembered, setIsRemembered] = useState(false);

    useEffect(() => {
        try {
            let storedUser = localStorage.getItem("user");
            let storedToken = localStorage.getItem("token");

            if (!storedUser || !storedToken) {
                storedUser = sessionStorage.getItem("user");
                storedToken = sessionStorage.getItem("token");
            }

            if (storedUser && storedToken) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                setToken(storedToken);
                const rememberedInLocal = !!localStorage.getItem("token");
                setIsRemembered(rememberedInLocal);
                try {
                    console.log("[AuthContext:init] loaded from", rememberedInLocal ? "localStorage" : "sessionStorage", {
                        hasUser: !!storedUser,
                        hasToken: !!storedToken,
                        isRemembered: rememberedInLocal
                    });
                } catch {}
            }
        } catch (error) {
            console.error(" Error parsing stored user:", error);
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            sessionStorage.removeItem("user");
            sessionStorage.removeItem("token");
            setIsRemembered(false);
        }
        setInitializing(false);
    }, []);

    const loginUser = (userData, userToken, rememberMe = false) => {
        setUser(userData);
        setToken(userToken);

        try {
            try {
                console.log("[AuthContext:loginUser] about to store", { rememberMe, hasUser: !!userData, hasToken: !!userToken });
            } catch {}
            if (rememberMe) {
                localStorage.setItem("user", JSON.stringify(userData));
                localStorage.setItem("token", userToken);

                sessionStorage.removeItem("user");
                sessionStorage.removeItem("token");
                setIsRemembered(true);
                try {
                    console.log("[AuthContext:loginUser] stored in localStorage", {
                        user: !!localStorage.getItem("user"),
                        token: !!localStorage.getItem("token")
                    });
                } catch {}
            } else {
                sessionStorage.setItem("user", JSON.stringify(userData));
                sessionStorage.setItem("token", userToken);

                localStorage.removeItem("user");
                localStorage.removeItem("token");
                setIsRemembered(false);
                try {
                    console.log("[AuthContext:loginUser] stored in sessionStorage", {
                        user: !!sessionStorage.getItem("user"),
                        token: !!sessionStorage.getItem("token")
                    });
                } catch {}
            }
        } catch (error) {
            console.error(" Failed to save user/token:", error);
        }
    };

    const logoutUser = () => {
        setUser(null);
        setToken(null);

        localStorage.removeItem("user");
        localStorage.removeItem("token");
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("token");
        setIsRemembered(false);
        try {
            console.log("[AuthContext:logoutUser] cleared storages");
        } catch {}
    };

    return (
        <AuthContext.Provider value={{ user, token, initializing, isRemembered, loginUser, logoutUser }}>
        {children}
        </AuthContext.Provider>
    );
};
