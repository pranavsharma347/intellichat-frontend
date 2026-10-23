import React, { useState } from "react";
import { Link } from "react-router-dom";
import AuthShell, { API, readError } from "./AuthShell";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) throw new Error(await readError(res, "Could not send the reset link. Try again."));
      setSent(true); // same message whether or not the email exists, on purpose
    } catch (err) {
      setError(
        err instanceof TypeError ? "Cannot reach the server. Is the backend running?" : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to set a new one."
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="fw-semibold" style={{ color: "#FF7B00" }}>
            Log in
          </Link>
        </>
      }
    >
      {sent ? (
        <div role="status">
          <div className="alert alert-success mb-3">
            ✅ If this email is registered, a reset link has been sent. Check your inbox and spam
            folder. The link works for 15 minutes.
          </div>
          <button
            type="button"
            className="btn btn-link p-0 fw-semibold"
            style={{ color: "#FF7B00" }}
            onClick={() => setSent(false)}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          )}

          <label htmlFor="email" className="form-label fw-semibold">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="form-control mb-3"
            style={{ backgroundColor: "#FFFFFF", color: "#000000", borderColor: "#E2E2E2" }}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            autoFocus
          />

          <button
            type="submit"
            disabled={loading}
            className="btn btn-lg w-100 fw-bold text-white ui-btn"
            style={{ backgroundColor: "#FF7B00", borderRadius: "40px" }}
          >
            {loading ? "Please wait..." : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default ForgotPassword;
