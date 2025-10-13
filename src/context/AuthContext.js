import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);

    useEffect(() => {
        try {
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("token");

        if (storedUser && storedToken) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setToken(storedToken);
        }
        } catch (error) {
        console.error("❌ Error parsing stored user:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        }
    }, []);

    const loginUser = (userData, userToken) => {
        setUser(userData);
        setToken(userToken);


        try {
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", userToken);
        } catch (error) {
        console.error("❌ Failed to save user/token:", error);
        }
    };

    const logoutUser = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
    };

    return (
        <AuthContext.Provider value={{ user, token, loginUser, logoutUser }}>
        {children}
        </AuthContext.Provider>
    );
};
