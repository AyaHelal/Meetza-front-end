import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { BrandingProvider, BrandingContext } from './context/BrandingContext';
import { API_BASE_URL } from './API/axiosInstance';
import Login from './pages/Login/Login';
import SignUp from './pages/SignUp/SignUp';
import Landing from './pages/Landing/Landing.js';
import Blog from './pages/Blog/Blog';
import BlogPost from './pages/Blog/BlogPost';
import TermsPage from './pages/Legal/TermsPage';
import PrivacyPage from './pages/Legal/PrivacyPage';
import GuidelinesPage from './pages/Legal/GuidelinesPage';
import GroupChat from './pages/GroupChat/GroupChat';
import HomePage from './pages/Home/HomePage';
import ProfilePage from './pages/Profile/ProfilePage';
import VideoSessions from './pages/VideoSessions/VideoSessions';
import AllVideosPage from './pages/VideoSessions/AllVideosPage';
import SavedVideos from './pages/SavedVideos/SavedVideos';
import Groups from './pages/Groups/Groups';
import Calendar from './pages/Calendar/Calendar';
import Meetings from './pages/Meetings/Meetings';
import VerifyEmailCode from './pages/VerifyEmail/VerifyEmailCode';
import ForgotPasswordForm from './pages/ForgotPassword/ForgotPasswordForm';
import VerifyResetCode from './pages/ForgotPassword/VerifyResetCode';
import ResetPassword from './pages/ForgotPassword/ResetPassword';
import PageLoader from './components/PageLoader/PageLoader.js';
import AppLayout from './components/AppLayout/AppLayout';
import AdminRoute from './components/AdminRoute';
import CalendarRoute from './components/CalendarRoute';
import ProfileRoute from './components/ProfileRoute';
import AdminMeetingPage from './pages/AdminMeeting/AdminMeetingPage';
import VideoBySlugPage from './pages/VideoSessions/VideoBySlugPage';
import AppearancePage from './pages/Settings/AppearancePage';
import { ChatbotProvider, ChatbotContainer } from './components/chatbot/chatbot';
import NotFound from './pages/NotFound/NotFound';
import { useEffect, useContext, useRef, useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ensureUiSoundsUnlocked } from "./utils/uiSounds";

/** Left-nav / AppLayout routes: suppress Lottie only when navigating between these. */
function isMainAppShellPath(pathname) {
  if (!pathname || typeof pathname !== "string") return false;
  const exact = [
    "/home",
    "/messages",
    "/groups",
    "/calendar",
    "/meetings",
    "/video-sessions",
    "/saved-videos",
    "/admin-meetings",
    "/profile",
    "/settings",
  ];
  if (exact.includes(pathname)) return true;
  return /^\/video(\/|$)/.test(pathname);
}

const AppRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, initializing, isRemembered, loginUser } = useContext(AuthContext);
  const socialLoginProcessed = useRef(false);
  const prevPathRef = useRef(location.pathname);
  const [routeLoading, setRouteLoading] = useState(false);
  // const [isChatbotOpen, setIsChatbotOpen] = useState(false); // Managed by ChatbotProvider now

  useEffect(() => {
    ensureUiSoundsUnlocked();
  }, []);

  // Lottie on route change for login, logout, landing, etc. — not when swapping main shell tabs only.
  useEffect(() => {
    const current = location.pathname;
    const prev = prevPathRef.current ?? "";
    prevPathRef.current = current;

    const isAuthRoute = (p) => p === "/login" || p === "/signup";
    const isLandingRoute = (p) => p === "/" || p === "/landing";

    const suppressAuthSwitchLoader = isAuthRoute(current) && isAuthRoute(prev);
    const suppressAuthEntryFromLanding = isAuthRoute(current) && isLandingRoute(prev);
    const suppressMainShellLoader = isMainAppShellPath(current) && isMainAppShellPath(prev);

    if (suppressMainShellLoader || suppressAuthSwitchLoader || suppressAuthEntryFromLanding) {
      setRouteLoading(false);
      return;
    }

    setRouteLoading(true);
    const t = setTimeout(() => setRouteLoading(false), 650);
    return () => clearTimeout(t);
  }, [location.pathname]);

  // When user closes tab/window while in a meeting, call leave API (same as Leave button)
  // Uses sendBeacon (more reliable on unload) with token in URL - backend accepts it via verifyTokenOrQuery
  useEffect(() => {
    const sendLeaveOnUnload = () => {
      try {
        const activeMeetingId = sessionStorage.getItem("activeMeetingId");
        if (!activeMeetingId) return;
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        if (!token) return;
        const base = API_BASE_URL.includes("ngrok")
          ? `${API_BASE_URL}/meeting/${activeMeetingId}/leave?token=${encodeURIComponent(token)}&ngrok-skip-browser-warning=true`
          : `${API_BASE_URL}/meeting/${activeMeetingId}/leave?token=${encodeURIComponent(token)}`;
        if (navigator.sendBeacon) {
          navigator.sendBeacon(base, new Blob([], { type: "application/json" }));
        } else {
          fetch(base, { method: "POST", keepalive: true });
        }
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener("beforeunload", sendLeaveOnUnload);
    window.addEventListener("pagehide", sendLeaveOnUnload);
    return () => {
      window.removeEventListener("beforeunload", sendLeaveOnUnload);
      window.removeEventListener("pagehide", sendLeaveOnUnload);
    };
  }, []);


  const { domains } = useContext(BrandingContext);

  // Handle social login redirect
  useEffect(() => {
    // Only process if we have token or error in URL and haven't processed yet
    const urlParams = new URLSearchParams(location.search);
    const tokenFromUrl = urlParams.get('token');
    const userDataStr = urlParams.get('user');
    const error = urlParams.get('error');

    // Skip if no token/error or already processed
    if ((!tokenFromUrl && !error) || socialLoginProcessed.current) {
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
    if (tokenFromUrl) {
      try {
        let userData = null;

        // Parse user data from URL (comes from backend)
        if (userDataStr) {
          try {
            userData = JSON.parse(decodeURIComponent(userDataStr));

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
        loginUser(userData, tokenFromUrl, true); // true = localStorage (remember me)

        // Wait a bit for state to update, then navigate
        setTimeout(() => {
          // Verify token is still there before navigating
          const verifyToken = localStorage.getItem('token');
          if (verifyToken) {
            navigate('/home', { replace: true });
          } else {
            console.error('❌ Token not found after storage, retrying...');
            // Retry storing
            loginUser(userData, tokenFromUrl, true);
            setTimeout(() => navigate('/home', { replace: true }), 200);
          }
        }, 100);
      } catch (error) {
        console.error('❌ Error handling social login:', error);
        // Clean up URL even on error
        navigate('/login', { replace: true });
      }
    }
  }, [location.search, loginUser, navigate, domains]);

  if (initializing || routeLoading) {
    return <PageLoader />;
  }

  return (
    <>
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
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/guidelines" element={<GuidelinesPage />} />
      <Route path="/verify-email" element={<VerifyEmailCode />} />
      <Route path="/forgot-password" element={<ForgotPasswordForm />} />
      <Route path="/verify-reset-code" element={<VerifyResetCode />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Protected routes: single AppLayout stays mounted across /home, /groups, /meetings */}
      <Route
        path="/"
        element={token ? <AppLayout /> : <Navigate to="/landing" replace />}
      >
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<HomePage />} />
        <Route
          path="profile"
          element={
            <ProfileRoute>
              <ProfilePage />
            </ProfileRoute>
          }
        />
        <Route path="messages" element={<GroupChat />} />
        <Route path="video" element={<AllVideosPage />} />
        <Route path="video/:slug" element={<VideoBySlugPage />} />
        <Route path="video-sessions" element={<VideoSessions />} />
        <Route path="saved-videos" element={<SavedVideos />} />
        <Route path="groups" element={<Groups />} />
        <Route
          path="calendar"
          element={
            <CalendarRoute>
              <Calendar />
            </CalendarRoute>
          }
        />
        <Route path="meetings" element={<Meetings />} />
        <Route
          path="admin-meetings"
          element={
            <AdminRoute>
              <AdminMeetingPage />
            </AdminRoute>
          }
        />
        <Route path="settings" element={<AppearancePage />} />
      </Route>
      <Route path="/not-found" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/not-found" replace />} />
    </Routes>
    {/* Global Robot Orb and Chatbot - Hidden on landing and auth pages */}
    {!(location.pathname === "/" || location.pathname === "/landing" || location.pathname === "/login" || location.pathname === "/signup" || location.pathname === "/verify-email" || location.pathname === "/forgot-password" || location.pathname === "/verify-reset-code" || location.pathname === "/reset-password") && (
      <ChatbotContainer />
    )}
    </>
  );
};

function App() {
  return (
    <BrandingProvider>
      <ChatbotProvider>
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
      </ChatbotProvider>
    </BrandingProvider>
  );
}

export default App;
