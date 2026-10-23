import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthShell, { API, readError } from "./AuthShell";

function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || ""; // comes from the link in the email

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [linkProblem, setLinkProblem] = useState(false);
  const [loading, setLoading] = useState(false);
  // "missing" = no token in the URL, "checking" = asking the server, "invalid" = expired or used, "valid" = show form
  const [status, setStatus] = useState(token ? "checking" : "missing");

  // Check the link as soon as the page opens, so the user never types a password for a dead link
  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/auth/reset-password/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (alive) setStatus(res.status === 400 ? "invalid" : "valid");
      } catch {
        // Server not reachable: show the form anyway, submitting will show the real error
        if (alive) setStatus("valid");
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      if (!res.ok) {
        if (res.status === 400) setLinkProblem(true);
        throw new Error(await readError(res, "This reset link is invalid or has expired."));
      }
      navigate("/login", {
        replace: true,
        state: { notice: "Password updated! Log in with your new password." },
      });
    } catch (err) {
      setError(
        err instanceof TypeError ? "Cannot reach the server. Is the backend running?" : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const requestNew = (
    <Link to="/forgot-password" className="fw-semibold" style={{ color: "#FF7B00" }}>
      Request a new link
    </Link>
  );

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a password you have not used here before."
      footer={
        <>
          Back to{" "}
          <Link to="/login" className="fw-semibold" style={{ color: "#FF7B00" }}>
            Log in
          </Link>
        </>
      }
    >
      {status === "missing" ? (
        <div role="alert">
          <div className="alert alert-warning mb-3">
            This reset link is incomplete. Please open the full link from your email.
          </div>
          {requestNew}
        </div>
      ) : status === "checking" ? (
        <p className="mb-0" role="status" style={{ color: "#555" }}>
          Checking your link...
        </p>
      ) : status === "invalid" ? (
        <div role="alert">
          <div className="alert alert-warning mb-3">
            This reset link has expired or was already used.
          </div>
          {requestNew}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-danger py-2" role="alert">
              {error}
              {linkProblem && <div className="mt-1">{requestNew}</div>}
            </div>
          )}

          <label htmlFor="password" className="form-label fw-semibold">
            New password
          </label>
          <div className="input-group mb-3">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="form-control"
              style={{ backgroundColor: "#FFFFFF", color: "#000000", borderColor: "#E2E2E2" }}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              autoFocus
            />
            <button
              type="button"
              className="btn btn-outline-dark"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <label htmlFor="confirm" className="form-label fw-semibold">
            Confirm new password
          </label>
          <input
            id="confirm"
            type={showPassword ? "text" : "password"}
            className="form-control mb-3"
            style={{ backgroundColor: "#FFFFFF", color: "#000000", borderColor: "#E2E2E2" }}
            placeholder="Type it again"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="btn btn-lg w-100 fw-bold text-white ui-btn"
            style={{ backgroundColor: "#FF7B00", borderRadius: "40px" }}
          >
            {loading ? "Please wait..." : "Update password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default ResetPassword;
