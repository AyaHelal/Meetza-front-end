import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login/Login';
import SignUp from './pages/SignUp/SignUp';
import Landing from './pages/Landing/Landing.js';
import Home from './pages/Home/Home';
import VerifyEmailCode from './pages/VerifyEmail/VerifyEmailCode';
import ForgotPasswordForm from './pages/ForgotPassword/ForgotPasswordForm';
import VerifyResetCode from './pages/ForgotPassword/VerifyResetCode';
import ResetPassword from './pages/ForgotPassword/ResetPassword';
import PageLoader from './components/PageLoader/PageLoader.js';
import { useState, useEffect, useContext } from "react";
const AppRoutes = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const { token, initializing, isRemembered } = useContext(AuthContext);

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
        element={token ? <Home /> : <Navigate to="/landing" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
