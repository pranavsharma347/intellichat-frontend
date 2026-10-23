import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import pranavImg from "./images/pranav.png";
import { FaLinkedin, FaGithub, FaFacebook, FaInstagram } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// FastAPI errors come as {detail: "text"} or {detail: [{msg: "..."}]}
async function readError(res, fallback) {
  try {
    const data = await res.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  } catch {
    /* body was not JSON */
  }
  return fallback;
}

function Login() {
  const theme = "light"; // login page always keeps its original look
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/chat";

  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [needsVerify, setNeedsVerify] = useState(false);
  const [resending, setResending] = useState(false);
  const [loading, setLoading] = useState(false);

  // Theme based styles (same palette as Home)
  const bg = theme === "light" ? "#FFFFFF" : "#0D0D0D";
  const text = theme === "light" ? "#000000" : "#FFFFFF";
  const cardBg = theme === "light" ? "#F7F7F7" : "#1A1A1A";
  const secondaryText = theme === "light" ? "#555" : "#CCCCCC";
  const border = theme === "light" ? "#E2E2E2" : "#2A2A33";
  const inputBg = theme === "light" ? "#FFFFFF" : "#0D0D0D";

  const isSignup = mode === "signup";

  const doLogin = async () => {
    // OAuth2PasswordRequestForm expects form data with the field name "username"
    const body = new URLSearchParams({
      username: email.trim().toLowerCase(),
      password,
    });
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      const err = new Error(await readError(res, "Invalid email or password"));
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);
  };

  const doSignup = async () => {
    const res = await fetch(`${API}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    if (!res.ok) throw new Error(await readError(res, "Could not create the account"));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isSignup && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setNotice("");
    setNeedsVerify(false);
    setLoading(true);
    try {
      if (isSignup) {
        await doSignup();
        setMode("login");
        setPassword("");
        setShowPassword(false);
        setNotice(
          `Registered successfully! We sent a verification link to ${email.trim()}. ` +
            "Open it to verify your email, then log in. Check your Spam folder too."
        );
      } else {
        await doLogin();
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      setNeedsVerify(err.status === 403);
      setError(
        err instanceof TypeError
          ? "Cannot reach the server. Is the backend running?"
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    setResending(true);
    try {
      const res = await fetch(`${API}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) throw new Error(await readError(res, "Could not send the email. Try again."));
      setError("");
      setNeedsVerify(false);
      setNotice("Verification email sent again. Check your inbox and Spam folder.");
    } catch (err) {
      setError(
        err instanceof TypeError ? "Cannot reach the server. Is the backend running?" : err.message
      );
    } finally {
      setResending(false);
    }
  };

  const switchMode = () => {
    setMode(isSignup ? "login" : "signup");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setError("");
    setNotice("");
    setNeedsVerify(false);
  };

  return (
    <main
      data-bs-theme="light"
      className="container-fluid p-0"
      style={{ backgroundColor: bg, color: text, transition: "0.3s" }}
    >
      <div className="row g-0 min-vh-100">
        {/* FORM SIDE */}
        <div className="col-lg-6 d-flex flex-column justify-content-center align-items-center p-4">
          <div style={{ width: "100%", maxWidth: "420px" }}>
            <Link
              to="/"
              className="fw-bold fs-3 text-decoration-none d-inline-block mb-4"
              style={{ color: "#FF7B00" }}
            >
              IntelliChat
            </Link>

            <h1 className="fw-bold fs-2 mb-1">
              {isSignup ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mb-4" style={{ color: secondaryText }}>
              {isSignup
                ? "Sign up to start chatting. It takes a minute."
                : "Log in to pick up your conversations."}
            </p>

            <form
              key={mode}
              onSubmit={handleSubmit}
              className="p-4"
              style={{
                backgroundColor: cardBg,
                border: `1px solid ${border}`,
                borderRadius: "20px",
              }}
            >
              {notice && (
                <div className="alert alert-success py-2" role="status">
                  ✅ {notice}
                </div>
              )}

              {error && (
                <div className="alert alert-danger py-2" role="alert">
                  {error}
                  {needsVerify && (
                    <div className="mt-1">
                      <button
                        type="button"
                        className="btn btn-link p-0 fw-semibold"
                        style={{ color: "#FF7B00" }}
                        onClick={resendVerification}
                        disabled={resending}
                      >
                        {resending ? "Sending..." : "Resend verification email"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <label htmlFor="email" className="form-label fw-semibold">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="form-control mb-3"
                style={{ backgroundColor: inputBg, color: text, borderColor: border }}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              <label htmlFor="password" className="form-label fw-semibold">
                Password
              </label>
              <div className="input-group mb-2">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  style={{ backgroundColor: inputBg, color: text, borderColor: border }}
                  placeholder={isSignup ? "At least 8 characters" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  required
                />
                <button
                  type="button"
                  className={`btn ${
                    theme === "light" ? "btn-outline-dark" : "btn-outline-light"
                  }`}
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {!isSignup && (
                <div className="text-end mb-3">
                  <Link
                    to="/forgot-password"
                    className="small"
                    style={{ color: "#FF7B00" }}
                  >
                    Forgot password?
                  </Link>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-lg w-100 fw-bold text-white ui-btn mt-2"
                style={{ backgroundColor: "#FF7B00", borderRadius: "40px" }}
              >
                {loading
                  ? "Please wait..."
                  : isSignup
                  ? "Create account"
                  : "Log in"}
              </button>
            </form>

            <p className="text-center mt-4 mb-0" style={{ color: secondaryText }}>
              {isSignup ? "Already have an account? " : "New to IntelliChat? "}
              <button
                type="button"
                onClick={switchMode}
                className="btn btn-link p-0 align-baseline fw-semibold"
                style={{ color: "#FF7B00" }}
              >
                {isSignup ? "Log in" : "Create an account"}
              </button>
            </p>
          </div>
        </div>

        {/* FOUNDER SIDE (hidden on small screens), same style as the IntelliDocs page */}
        <div
          className="col-lg-6 d-none d-lg-flex flex-column justify-content-center align-items-center p-5"
          style={{ backgroundColor: theme === "light" ? "#F4F4F4" : "#111111" }}
        >
          <div style={{ width: "100%", maxWidth: "460px" }}>
            <div className="text-center mb-4">
              <img
                src={pranavImg}
                alt="Founder"
                className="img-fluid"
                style={{ width: "230px", borderRadius: "90px" }}
              />
            </div>

            <h2 className="fw-bold display-6 mb-3" style={{ color: "#FF7B00" }}>
              The Vision Behind IntelliChat
            </h2>

            <p className="fs-5" style={{ color: text }}>
              I’m <b>Pranav Datta Sharma</b>, creator of IntelliChat. My mission
              is to build an AI assistant that gives fast, up-to-date answers
              — so you save time and focus on what truly matters.
            </p>

            <p className="fs-6" style={{ color: secondaryText }}>
              Software Engineer | Python • FastAPI • LangGraph • Gemini • Generative AI
            </p>

            <div className="mt-3 d-flex flex-wrap gap-3">
              <a
                href="https://www.linkedin.com/in/pranav-sharma98"
                className={`btn rounded-pill px-3 d-flex align-items-center gap-2 ${theme === "light" ? "btn-outline-dark" : "btn-outline-light"}`}
                target="_blank"
                rel="noreferrer"
              >
                <FaLinkedin size={18} /> LinkedIn
              </a>
              <a
                href="https://github.com/pranavsharma347/"
                className={`btn rounded-pill px-3 d-flex align-items-center gap-2 ${theme === "light" ? "btn-outline-dark" : "btn-outline-light"}`}
                target="_blank"
                rel="noreferrer"
              >
                <FaGithub size={18} /> GitHub
              </a>
              <a
                href="https://www.facebook.com/pranav.sharma.12576/"
                className={`btn rounded-pill px-3 d-flex align-items-center gap-2 ${theme === "light" ? "btn-outline-dark" : "btn-outline-light"}`}
                target="_blank"
                rel="noreferrer"
              >
                <FaFacebook size={18} /> Facebook
              </a>
              <a
                href="https://www.instagram.com/pranavsharma886/"
                className={`btn rounded-pill px-3 d-flex align-items-center gap-2 ${theme === "light" ? "btn-outline-dark" : "btn-outline-light"}`}
                target="_blank"
                rel="noreferrer"
              >
                <FaInstagram size={18} /> Instagram
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Login;
