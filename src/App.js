import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login/Login';
import SignUp from './pages/SignUp/SignUp';
import Landing from './pages/Landing/Landing.js';
import GroupChat from './pages/GroupChat/GroupChat';
import Groups from './pages/Groups/Groups';
import VerifyEmailCode from './pages/VerifyEmail/VerifyEmailCode';
import ForgotPasswordForm from './pages/ForgotPassword/ForgotPasswordForm';
import VerifyResetCode from './pages/ForgotPassword/VerifyResetCode';
import ResetPassword from './pages/ForgotPassword/ResetPassword';
import PageLoader from './components/PageLoader/PageLoader.js';
import AppLayout from './components/AppLayout/AppLayout';
import { useState, useEffect, useContext } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const AppRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { token, initializing, isRemembered, loginUser } = useContext(AuthContext);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);


  useEffect(() => {
    if (location.pathname.startsWith("/landing")) {
      setLoading(true);
      const timer = setTimeout(() => setLoading(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [location]);

  // Show loader only on initial navigation to /home (not when switching between pages)
  useEffect(() => {
    // Only show loader on initial mount or when coming from a different route type
    const isProtectedRoute = location.pathname === "/home" || location.pathname === "/groups";
    const wasProtectedRoute = sessionStorage.getItem('lastRoute')?.startsWith('/home') ||
      sessionStorage.getItem('lastRoute')?.startsWith('/groups');

    if (isProtectedRoute && !wasProtectedRoute && location.pathname === "/home") {
      setLoading(true);
      const timer = setTimeout(() => setLoading(false), 500);
      return () => clearTimeout(timer);
    }

  // Store current route
  sessionStorage.setItem('lastRoute', location.pathname);
  }, [location.pathname]);

  // Handle social login redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    const user = urlParams.get('user');

    if (token && user) {
      try {
        const userData = JSON.parse(decodeURIComponent(user));
        loginUser(userData, token, false); // Assuming not remembered for social login
        // Clean up URL
        navigate(location.pathname, { replace: true });
        // Navigate to home
        navigate('/home');
      } catch (error) {
        console.error('Error parsing social login data:', error);
      }
    }
  }, [location.search, loginUser, navigate]);

  if (loading || initializing) {
    return <PageLoader />;
  }

  return (
    <Routes>
      {/* Root: default to Landing; if remembered session exists, go to /home */}
      <Route
        path="/"
        element={token && isRemembered ? <Navigate to="/home" replace /> : <Landing />}
      />
      <Route
        path="/login"
        element={token ? <Navigate to="/home" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={token ? <Navigate to="/home" replace /> : <SignUp />}
      />
      {/* Public Landing route */}
      <Route path="/landing" element={<Landing />} />
      <Route path="/verify-email" element={<VerifyEmailCode />} />
      <Route path="/forgot-password" element={<ForgotPasswordForm />} />
      <Route path="/verify-reset-code" element={<VerifyResetCode />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Protected Home: if no token, go to Landing */}
      <Route
        path="/home"
        element={token ? <AppLayout><GroupChat /></AppLayout> : <Navigate to="/landing" replace />}
      />
      <Route
        path="/groups"
        element={token ? <AppLayout><Groups /></AppLayout> : <Navigate to="/landing" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>


  );
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
          <AppRoutes />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
