import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import Home from "./Home";
import Chat from "./Chat";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";
import VerifyEmail from "./VerifyEmail";

const isAuthenticated = () => !!localStorage.getItem("access_token");

// Login page: only for people who are NOT logged in
function PublicOnly({ children }) {
  return isAuthenticated() ? <Navigate to="/chat" replace /> : children;
}

// Private pages: only for logged-in people
function Protected({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* First page for a new visitor */}
        <Route path="/" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />

        {/* Password reset: open to everyone (the reset link opens /reset-password?token=...) */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Marketing home page, open to everyone */}
        <Route path="/home" element={<Home />} />

        {/* Chat: /chat is a new chat, /chat/12 opens chat number 12 */}
        <Route path="/chat/:chatId?" element={<Protected><Chat /></Protected>} />
        <Route path="/history" element={<Navigate to="/chat" replace />} />

        {/* Anything unknown goes to the first page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
