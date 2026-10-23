import React from "react";
import { Link } from "react-router-dom";

export const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// FastAPI errors come as {detail: "text"} or {detail: [{msg: "..."}]}
export async function readError(res, fallback) {
  try {
    const data = await res.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  } catch {
    /* body was not JSON */
  }
  return fallback;
}

// Shared look for the small account pages (same style as the Login form card).
export default function AuthShell({ title, subtitle, footer, children }) {
  return (
    <main
      data-bs-theme="light"
      className="min-vh-100 d-flex justify-content-center align-items-center p-4"
      style={{ backgroundColor: "#FFFFFF", color: "#000000" }}
    >
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <Link
          to="/"
          className="fw-bold fs-3 text-decoration-none d-inline-block mb-4"
          style={{ color: "#FF7B00" }}
        >
          IntelliChat
        </Link>

        <h1 className="fw-bold fs-2 mb-1">{title}</h1>
        <p className="mb-4" style={{ color: "#555" }}>
          {subtitle}
        </p>

        <div
          className="p-4"
          style={{
            backgroundColor: "#F7F7F7",
            border: "1px solid #E2E2E2",
            borderRadius: "20px",
          }}
        >
          {children}
        </div>

        {footer && (
          <p className="text-center mt-4 mb-0" style={{ color: "#555" }}>
            {footer}
          </p>
        )}
      </div>
    </main>
  );
}
