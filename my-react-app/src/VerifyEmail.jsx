import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthShell, { API, readError } from "./AuthShell";

function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") || ""; // comes from the link in the email
  // "missing" | "checking" | "done" | "failed"
  const [status, setStatus] = useState(token ? "checking" : "missing");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!alive) return;
        if (res.ok) {
          setStatus("done");
        } else {
          setMessage(await readError(res, "This verification link is invalid or has expired."));
          setStatus("failed");
        }
      } catch {
        if (alive) {
          setMessage("Cannot reach the server. Is the backend running?");
          setStatus("failed");
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const loginLink = (text) => (
    <Link to="/login" className="btn btn-lg w-100 fw-bold text-white ui-btn"
      style={{ backgroundColor: "#FF7B00", borderRadius: "40px" }}>
      {text}
    </Link>
  );

  return (
    <AuthShell
      title={status === "done" ? "Email verified" : "Verify your email"}
      subtitle={
        status === "done"
          ? "Your account is active."
          : "We are confirming your email address."
      }
    >
      {status === "missing" && (
        <div role="alert">
          <div className="alert alert-warning mb-3">
            This verification link is incomplete. Please open the full link from your email.
          </div>
          {loginLink("Go to log in")}
        </div>
      )}

      {status === "checking" && (
        <p className="mb-0" role="status" style={{ color: "#555" }}>
          Verifying your email...
        </p>
      )}

      {status === "done" && (
        <div role="status">
          <div className="alert alert-success mb-3">
            ✅ Your email is verified. You can now log in.
          </div>
          {loginLink("Log in")}
        </div>
      )}

      {status === "failed" && (
        <div role="alert">
          <div className="alert alert-danger mb-3">{message}</div>
          <p className="small" style={{ color: "#555" }}>
            Log in with your email and password, and use <b>Resend verification email</b> to get a
            new link.
          </p>
          {loginLink("Go to log in")}
        </div>
      )}
    </AuthShell>
  );
}

export default VerifyEmail;
