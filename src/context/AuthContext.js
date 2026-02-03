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
            const rememberFlag = localStorage.getItem("remember");
            const loginTime = localStorage.getItem("loginTime");

            if (!storedUser || !storedToken) {
                storedUser = sessionStorage.getItem("user");
                storedToken = sessionStorage.getItem("token");
            }

            if (storedUser && storedToken) {
                // Check if token has expired (24 hours for remember me)
                const rememberedInLocal = rememberFlag === "true";
                if (rememberedInLocal && loginTime) {
                    const currentTime = new Date().getTime();
                    const storedTime = parseInt(loginTime);
                    const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

                    if (currentTime - storedTime > twentyFourHours) {
                        // Token expired, clear stored data
                        localStorage.removeItem("user");
                        localStorage.removeItem("token");
                        localStorage.removeItem("remember");
                        localStorage.removeItem("loginTime");
                        setInitializing(false);
                        return;
                    }
                }

                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                setToken(storedToken);
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
                // Only store user if it exists
                if (userData) {
                    localStorage.setItem("user", JSON.stringify(userData));
                } else {
                    localStorage.removeItem("user");
                }
                localStorage.setItem("token", userToken);
                localStorage.setItem("remember", "true");

                sessionStorage.removeItem("user");
                sessionStorage.removeItem("token");
                setIsRemembered(true);
            } else {
                // Only store user if it exists
                if (userData) {
                    sessionStorage.setItem("user", JSON.stringify(userData));
                } else {
                    sessionStorage.removeItem("user");
                }
                sessionStorage.setItem("token", userToken);

                localStorage.removeItem("user");
                localStorage.removeItem("token");
                localStorage.setItem("remember", "false");
                setIsRemembered(false);
            }
            console.log("✅ loginUser: Token and user data stored successfully");
        } catch (error) {
            console.error("❌ Failed to save user/token:", error);
        }
    };

    const logoutUser = () => {
        setUser(null);
        setToken(null);

        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("remember");
        localStorage.removeItem("loginTime");
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
