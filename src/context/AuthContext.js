import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);

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
            }
        } catch (error) {
            console.error("❌ Error parsing stored user:", error);
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            sessionStorage.removeItem("user");
            sessionStorage.removeItem("token");
        }
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
            } else {
                sessionStorage.setItem("user", JSON.stringify(userData));
                sessionStorage.setItem("token", userToken);

                localStorage.removeItem("user");
                localStorage.removeItem("token");
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
    };

    return (
        <AuthContext.Provider value={{ user, token, loginUser, logoutUser }}>
        {children}
        </AuthContext.Provider>
    );
};
