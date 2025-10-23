import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from './context/AuthContext';
import SocialAuthProvider from './components/SocialAuth/SocialAuthProvider';
import Login from './pages/Login/Login';
import SignUp from './pages/SignUp/SignUp';
import VerifyEmailCode from './pages/VerifyEmail/VerifyEmailCode';
import ForgotPasswordForm from './pages/ForgotPassword/ForgotPasswordForm';
import VerifyResetCode from './pages/ForgotPassword/VerifyResetCode';
import ResetPassword from './pages/ForgotPassword/ResetPassword';

function App() {
  return (
    <AuthProvider>
      <SocialAuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/verify-email" element={<VerifyEmailCode />} />
            <Route path="/forgot-password" element={<ForgotPasswordForm />} />
            <Route path="/verify-reset-code" element={<VerifyResetCode />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </SocialAuthProvider>
    </AuthProvider>
  );
}

export default App;
