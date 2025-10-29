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
                // Determine if it was remembered (from localStorage)
                const rememberedInLocal = !!localStorage.getItem("token");
                setIsRemembered(rememberedInLocal);
            }
        } catch (error) {
            console.error("❌ Error parsing stored user:", error);
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
            if (rememberMe) {
                localStorage.setItem("user", JSON.stringify(userData));
                localStorage.setItem("token", userToken);

                sessionStorage.removeItem("user");
                sessionStorage.removeItem("token");
                setIsRemembered(true);
            } else {
                sessionStorage.setItem("user", JSON.stringify(userData));
                sessionStorage.setItem("token", userToken);

                localStorage.removeItem("user");
                localStorage.removeItem("token");
                setIsRemembered(false);
            }
        } catch (error) {
            console.error("❌ Failed to save user/token:", error);
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
    };

    return (
        <AuthContext.Provider value={{ user, token, initializing, isRemembered, loginUser, logoutUser }}>
        {children}
        </AuthContext.Provider>
    );
};
