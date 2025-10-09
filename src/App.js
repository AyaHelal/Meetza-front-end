import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from './pages/Login/Login';
import SignUp from './pages/SignUp/SignUp';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        {/* Login Page */}
        <Route path="/login" element={<Login />} />

        {/* Sign Up Page */}
        <Route path="/signup" element={<SignUp />} />

        {/* 404 Page - لو المستخدم دخل على صفحة مش موجودة */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
