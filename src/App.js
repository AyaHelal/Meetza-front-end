import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login/Login';
import SignUp from './pages/SignUp/SignUp';
import Landing from './pages/Landing/Landing.js';
import GroupChat from './pages/GroupChat/GroupChat';
import Groups from './pages/Groups/Groups';
import Meetings from './pages/Meetings/Meetings';
import VerifyEmailCode from './pages/VerifyEmail/VerifyEmailCode';
import ForgotPasswordForm from './pages/ForgotPassword/ForgotPasswordForm';
import VerifyResetCode from './pages/ForgotPassword/VerifyResetCode';
import ResetPassword from './pages/ForgotPassword/ResetPassword';
import PageLoader from './components/PageLoader/PageLoader.js';
import AppLayout from './components/AppLayout/AppLayout';
import { useState, useEffect, useContext, useRef } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const AppRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { token, initializing, isRemembered, loginUser } = useContext(AuthContext);
  const socialLoginProcessed = useRef(false);

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
    // Only process if we have token or error in URL and haven't processed yet
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    const user = urlParams.get('user');
    const error = urlParams.get('error');

    // Skip if no token/error or already processed
    if ((!token && !error) || socialLoginProcessed.current) {
      return;
    }

    // Mark as processed immediately to prevent re-processing
    socialLoginProcessed.current = true;

    // Handle error from OAuth
    if (error) {
      console.error('❌ OAuth error:', error);
      navigate('/login', { replace: true });
      return;
    }

    // Process token
    if (token) {
      try {
        let userData = null;

        // Parse user data from URL (comes from backend)
        if (user) {
          try {
            userData = JSON.parse(decodeURIComponent(user));
            console.log('✅ Parsed user data from URL:', userData);
            console.log('📸 Photo fields in user data:', {
              user_photo: userData?.user_photo,
              photo: userData?.photo,
              picture: userData?.picture,
              avatar: userData?.avatar,
              avatar_url: userData?.avatar_url,
              google_photo: userData?.google_photo
            });

            // Normalize Google photo field - Google OAuth typically returns 'picture'
            if (userData && !userData.user_photo && !userData.photo) {
              if (userData.picture) {
                userData.user_photo = userData.picture;
                userData.photo = userData.picture;
              } else if (userData.avatar) {
                userData.user_photo = userData.avatar;
                userData.photo = userData.avatar;
              } else if (userData.avatar_url) {
                userData.user_photo = userData.avatar_url;
                userData.photo = userData.avatar_url;
              } else if (userData.google_photo) {
                userData.user_photo = userData.google_photo;
                userData.photo = userData.google_photo;
              }
            }
          } catch (parseError) {
            console.error('❌ Failed to parse user data from URL:', parseError);
            // If user data parsing fails, still store token
          }
        }

        // Store token and user data in localStorage (like normal login)
        loginUser(userData, token, true); // true = localStorage (remember me)

        // Verify token was stored
        const storedToken = localStorage.getItem('token');
        console.log('✅ Social login successful');
        console.log('✅ Token stored in localStorage:', storedToken ? 'Yes' : 'No');
        console.log('✅ Token value:', storedToken ? storedToken.substring(0, 20) + '...' : 'None');
        console.log('✅ User data stored:', userData ? 'Yes' : 'No');

        // Wait a bit for state to update, then navigate
        setTimeout(() => {
          // Verify token is still there before navigating
          const verifyToken = localStorage.getItem('token');
          if (verifyToken) {
            console.log('✅ Token verified before navigation');
            navigate('/home', { replace: true });
          } else {
            console.error('❌ Token not found after storage, retrying...');
            // Retry storing
            loginUser(userData, token, true);
            setTimeout(() => navigate('/home', { replace: true }), 200);
          }
        }, 100);
      } catch (error) {
        console.error('❌ Error handling social login:', error);
        // Clean up URL even on error
        navigate('/login', { replace: true });
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
      <Route
        path="/meetings"
        element={token ? <AppLayout><Meetings /></AppLayout> : <Navigate to="/landing" replace />}
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
