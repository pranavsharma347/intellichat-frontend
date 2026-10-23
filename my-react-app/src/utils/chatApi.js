// src/utils/chatApi.js  (JWT version: every call sends the login token)
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const TOKEN_KEY = "access_token";

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
};

export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
};

// The email is stored inside the login token ("sub"), so no extra API call is needed.
// Used only for display, never for security.
export function getEmailFromToken() {
  try {
    const part = getToken().split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part)).sub || "";
  } catch {
    return "";
  }
}

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

async function authFetch(path, { method = "GET", body, signal } = {}) {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    if (e.name === "AbortError") throw e; // the user pressed Stop
    throw new Error("Cannot reach the server. Is the backend running?");
  }

  if (res.status === 401) {
    clearToken();
    window.location.replace("/login");
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    const err = new Error(await readError(res, "Something went wrong. Try again."));
    err.status = res.status;
    throw err;
  }
  return res;
}

const json = async (...args) => {
  const res = await authFetch(...args);
  return res.status === 204 ? null : res.json();
};

/* ---------------- conversations ---------------- */

export async function getConversations() {
  const list = await json("/conversations");
  const time = (c) => (c.created_at ? Date.parse(c.created_at) || 0 : 0);
  return [...list].sort((a, b) => time(b) - time(a) || Number(b.id) - Number(a.id)); // newest first
}

export const getMessages = (id) => json(`/conversations/${id}/messages`);

export const renameConversation = (id, title) =>
  json(`/conversations/${id}`, { method: "PATCH", body: { title } });

export const deleteConversation = (id) => json(`/conversations/${id}`, { method: "DELETE" });

/* ---------------- sending messages ---------------- */

// First message of a new chat: creates the chat, its title and the answer in one call.
export const newChat = (content, signal) =>
  json("/chat/new", { method: "POST", body: { content }, signal });

// Follow-up message: calls onChunk(text) for every piece of the reply as it arrives.
// Handles both plain-text streaming and Server-Sent Events ("data: ...").
export async function streamChat(id, content, onChunk, signal) {
  const res = await authFetch(`/conversations/${id}/chat/stream`, {
    method: "POST",
    body: { content },
    signal,
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sse = null;

  const flushEvent = (evt) => {
    const data = evt
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).replace(/^ /, ""))
      .join("\n");
    if (data && data !== "[DONE]") onChunk(data);
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (sse === null) sse = /^(data|event|id):/m.test(text);
    if (!sse) {
      onChunk(text);
      continue;
    }
    buffer += text.replace(/\r\n/g, "\n");
    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      flushEvent(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 2);
    }
  }
  if (sse && buffer.trim()) flushEvent(buffer);
}
