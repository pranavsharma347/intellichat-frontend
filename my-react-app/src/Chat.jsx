import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FaArrowUp,
  FaCheck,
  FaChevronUp,
  FaEllipsisH,
  FaMoon,
  FaPen,
  FaPlus,
  FaRegCopy,
  FaSignOutAlt,
  FaStop,
  FaSun,
  FaTrashAlt,
  FaUserTimes,
} from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "./ThemeContext";
import {
  clearToken,
  deleteAccount,
  deleteConversation,
  getConversations,
  getEmailFromToken,
  getMessages,
  newChat,
  renameConversation,
  streamChat,
} from "./utils/chatApi";

/* ------------------------------------------------------------------ */
/* small helpers                                                       */
/* ------------------------------------------------------------------ */

const FONT_IMPORT =
  '@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800&family=Hind:wght@400;500;600;700&display=swap");';

// Colours for both themes live here, so text always has strong contrast on its background.
const TOKENS = {
  light: {
    "--bg": "#ffffff", "--surface": "#f7f7f8", "--surface-2": "#ececef", "--line": "#e0e0e6",
    "--ink": "#16161a", "--muted": "#5f5f6b", "--accent": "#ff7b00", "--accent-ink": "#1a0d00",
    "--accent-soft": "rgba(255,123,0,0.14)", "--danger": "#d92d20", colorScheme: "light",
  },
  dark: {
    "--bg": "#0f0f12", "--surface": "#17171c", "--surface-2": "#24242c", "--line": "#32323d",
    "--ink": "#f2f2f5", "--muted": "#b0b0be", "--accent": "#ff7b00", "--accent-ink": "#1a0d00",
    "--accent-soft": "rgba(255,123,0,0.2)", "--danger": "#ff6b6b", colorScheme: "dark",
  },
};

const SUGGESTIONS = [
  "What are the latest AI news this week? Give me 3 headlines.",
  "What's the weather in Delhi, and what time is it in New York right now?",
  "Compare RAG and fine-tuning in a table, with a short Python example.",

];

// Page the user lands on after deleting their account. Change it if your login route is different.
const LOGIN_PATH = "/login";

const SIDE_MIN = 220;
const SIDE_MAX = 480;
const SIDE_DEFAULT = 272;
const clampWidth = (w) => Math.min(SIDE_MAX, Math.max(SIDE_MIN, w));

const isMobile = () => window.matchMedia("(max-width: 860px)").matches;

const fmt = (ms) => {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  return `${Math.floor(s / 60)} m ${Math.round(s % 60)} s`;
};

// Renders **bold** and keeps line breaks (CSS pre-wrap). For full markdown, swap in react-markdown.
function FormattedText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.length > 4 && p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    )
  );
}

function Dots() {
  return (
    <span className="icc-dots" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

// Logo: gradient tile with a chat bubble and a spark. Pulses while IntelliChat is working.
function Mark({ busy }) {
  return (
    <span className={`icc-mark ${busy ? "busy" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path
          d="M5 3.5h14A2.5 2.5 0 0 1 21.5 6v9a2.5 2.5 0 0 1-2.5 2.5h-6L8 21v-3.5H5A2.5 2.5 0 0 1 2.5 15V6A2.5 2.5 0 0 1 5 3.5z"
          fill="currentColor"
        />
        <path d="M12 6.6l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z" fill="#5B2CF0" />
      </svg>
    </span>
  );
}

// Three dots with a live timer, shown while waiting for the first word of the reply.
function Thinking({ startedAt }) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="icc-thinking" role="status" aria-label="IntelliChat is thinking">
      <Dots />
      <span className="icc-time">{fmt(now - startedAt)}</span>
    </span>
  );
}

function SidebarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.5 4v16" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <button
      type="button"
      className="icc-icon-btn"
      onClick={copy}
      aria-label={done ? "Copied" : "Copy reply"}
      title={done ? "Copied" : "Copy reply"}
    >
      {done ? <FaCheck /> : <FaRegCopy />}
    </button>
  );
}

// Code block with the language name and a copy button
function CodeBlock({ children }) {
  const code = children?.props?.children;
  const text = String(Array.isArray(code) ? code.join("") : code ?? "").replace(/\n$/, "");
  const lang = /language-([\w+-]+)/.exec(children?.props?.className || "")?.[1] || "code";
  return (
    <div className="icc-code">
      <div className="icc-code-head">
        <span>{lang}</span>
        <CopyButton text={text} />
      </div>
      <pre>{children}</pre>
    </div>
  );
}

const MD_COMPONENTS = {
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
  table: ({ node, ...props }) => (
    <div className="icc-table">
      <table {...props} />
    </div>
  ),
};

// Bot replies are Markdown: headings, lists, bold, code, tables, links
function Answer({ text }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
      {text}
    </ReactMarkdown>
  );
}

// One row in "Recent chats": title (or rename box) and a "..." button.
function ChatItem({ c, active, menuOpen, renaming, onOpen, onMenu, onCommit, onCancel }) {
  const [value, setValue] = useState(c.title || "");
  const done = useRef(false);
  const finish = (save) => {
    if (done.current) return;
    done.current = true;
    if (save) onCommit(value);
    else onCancel();
  };

  return (
    <div className={`icc-row ${active ? "active" : ""} ${menuOpen ? "menu-open" : ""} ${c.pending ? "pending" : ""}`}>
      {renaming ? (
        <input
          className="icc-rename"
          value={value}
          maxLength={100}
          autoFocus
          aria-label="Rename chat"
          onFocus={(e) => e.target.select()}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => finish(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") finish(true);
            if (e.key === "Escape") finish(false);
          }}
        />
      ) : (
        <>
          <button
            type="button"
            className="icc-item"
            onClick={onOpen}
            disabled={c.pending}
            aria-current={active ? "page" : undefined}
            title={c.title}
          >
            {c.title || "New chat"}
          </button>
          {!c.pending && (
            <button
              type="button"
              className="icc-icon-btn icc-more"
              data-menu-trigger
              onClick={onMenu}
              aria-label="Chat options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <FaEllipsisH />
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* the chat itself                                                     */
/* ------------------------------------------------------------------ */

function ChatApp() {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { chatId } = useParams(); // the chat id lives in the URL: /chat/:chatId
  const activeId = chatId || null; // null = a brand new chat
  const email = getEmailFromToken();

  const [conversations, setConversations] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [chatsError, setChatsError] = useState("");

  const [messages, setMessages] = useState([]); // [{ id, role, content, streaming?, startedAt?, ms?, stopped? }]
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [sideOpen, setSideOpen] = useState(() => !isMobile());
  const [menu, setMenu] = useState(null); // { id, x, y } for the chat "..." menu
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [accountModal, setAccountModal] = useState(false); // "Delete account" dialog
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [sideWidth, setSideWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem("icc-side-width"));
      return saved >= SIDE_MIN && saved <= SIDE_MAX ? saved : SIDE_DEFAULT;
    } catch {
      return SIDE_DEFAULT;
    }
  });
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("icc-side-width", String(sideWidth));
    } catch {
      /* storage blocked, the width just won't be remembered */
    }
  }, [sideWidth]);

  // Bumped every time the user switches chats, so a slow reply for chat A
  // never paints itself onto chat B.
  const viewToken = useRef(0);
  const scrollRef = useRef(null);
  const stickToBottom = useRef(true);
  const textareaRef = useRef(null);
  const abortRef = useRef(null); // lets the Stop button cancel the request
  const justCreated = useRef(null); // id of a chat we just made, so we don't reload it

  /* ----- load the sidebar list ----- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await getConversations();
        if (alive) setConversations(list);
      } catch (e) {
        if (alive) setChatsError(e.message);
      } finally {
        if (alive) setLoadingChats(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ----- whenever the URL chat id changes, show that chat ----- */
  useEffect(() => {
    const token = ++viewToken.current;
    stickToBottom.current = true;
    setError("");
    if (justCreated.current && justCreated.current !== chatId) justCreated.current = null;

    if (!chatId) {
      setMessages([]);
      setLoadingMsgs(false);
      return;
    }
    if (justCreated.current === chatId) return; // already on screen

    setMessages([]);
    setLoadingMsgs(true);
    (async () => {
      try {
        const rows = await getMessages(chatId);
        if (viewToken.current !== token) return;
        setMessages(rows.map((m) => ({ id: `m-${m.id}`, role: m.role, content: m.content })));
      } catch (e) {
        if (viewToken.current !== token) return;
        if (e.status === 404) {
          navigate("/chat", { replace: true });
          setError("That chat was not found.");
        } else {
          setError(e.message);
        }
      } finally {
        if (viewToken.current === token) setLoadingMsgs(false);
      }
    })();
  }, [chatId, navigate]);

  /* ----- close menus on outside click / Escape ----- */
  useEffect(() => {
    if (!menu && !userMenuOpen) return undefined;
    const onDown = (e) => {
      if (!e.target.closest(".icc-menu, [data-menu-trigger]")) {
        setMenu(null);
        setUserMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMenu(null);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu, userMenuOpen]);

  useEffect(() => {
    if (!deleteTarget && !accountModal) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (!deleting) setDeleteTarget(null);
      if (!deletingAccount) setAccountModal(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [deleteTarget, accountModal, deleting, deletingAccount]);

  /* ----- the browser tab shows the title of the open chat ----- */
  const activeTitle = activeId
    ? conversations.find((c) => String(c.id) === activeId)?.title
    : "";
  useEffect(() => {
    document.title = activeTitle ? `${activeTitle} | IntelliChat` : "IntelliChat";
  }, [activeTitle]);
  useEffect(
    () => () => {
      document.title = "IntelliChat"; // leaving the chat page
    },
    []
  );

  /* ----- keep the view pinned to the newest message ----- */
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, sending, loadingMsgs]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  /* ----- textarea grows with the text ----- */
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  /* ----- drag the sidebar edge to resize it ----- */
  const startResize = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setResizing(true);
  };
  const moveResize = (e) => {
    if (!resizing) return;
    const left = e.currentTarget.parentElement.getBoundingClientRect().left;
    setSideWidth(clampWidth(e.clientX - left));
  };
  const endResize = () => setResizing(false);
  const keyResize = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSideWidth((w) => clampWidth(w - 16));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSideWidth((w) => clampWidth(w + 16));
    }
  };

  /* ----- sidebar actions ----- */
  const closeOnMobile = () => {
    if (isMobile()) setSideOpen(false);
  };

  const startNewChat = () => {
    navigate("/chat");
    closeOnMobile();
    textareaRef.current?.focus();
  };

  const openConversation = (id) => {
    navigate(`/chat/${id}`);
    closeOnMobile();
  };

  const openMenu = (e, c) => {
    const r = e.currentTarget.getBoundingClientRect();
    const below = window.innerHeight - r.bottom > 120;
    setUserMenuOpen(false);
    setMenu((prev) =>
      prev?.id === c.id ? null : { id: c.id, x: Math.max(8, r.right - 168), y: below ? r.bottom + 4 : r.top - 100 }
    );
  };

  const commitRename = async (c, value) => {
    setRenamingId(null);
    const title = value.trim();
    if (!title || title === c.title) return;
    const before = c.title;
    setConversations((list) => list.map((x) => (x.id === c.id ? { ...x, title } : x)));
    try {
      await renameConversation(c.id, title);
    } catch (e) {
      setConversations((list) => list.map((x) => (x.id === c.id ? { ...x, title: before } : x)));
      setError(e.message);
    }
  };

  const confirmDelete = async () => {
    const target = deleteTarget;
    if (!target) return;
    setDeleting(true);
    try {
      await deleteConversation(target.id);
      setConversations((list) => list.filter((x) => x.id !== target.id));
      if (String(target.id) === activeId) navigate("/chat", { replace: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const openDeleteAccount = () => {
    setUserMenuOpen(false);
    setAccountError("");
    setAccountModal(true);
  };

  const confirmDeleteAccount = async () => {
    setDeletingAccount(true);
    setAccountError("");
    try {
      abortRef.current?.abort(); // stop any reply that is still being written
      await deleteAccount();
      clearToken();
      navigate(LOGIN_PATH, { replace: true });
    } catch (e) {
      setAccountError(e.message || "Could not delete your account. Try again.");
      setDeletingAccount(false);
    }
  };

  const logout = () => {
    abortRef.current?.abort();
    clearToken();
    navigate("/", { replace: true });
  };

  /* ----- sending a message ----- */
  const stop = () => abortRef.current?.abort();

  const send = async (override) => {
    const content = (override ?? input).trim();
    if (!content || sending) return;

    setInput("");
    setError("");
    setSending(true);
    stickToBottom.current = true;

    const token = viewToken.current;
    const stillHere = () => viewToken.current === token;
    const stamp = Date.now();
    const t0 = performance.now();
    const userMsg = { id: `u-${stamp}`, role: "user", content };
    const botId = `a-${stamp}`;
    const placeholder = { id: botId, role: "assistant", content: "", streaming: true, startedAt: t0 };
    const controller = new AbortController();
    abortRef.current = controller;
    const isNew = !activeId;
    const knownIds = new Set(conversations.map((c) => String(c.id)));

    try {
      if (isNew) {
        // First message of a new chat: one call creates chat + title + answer.
        setMessages([userMsg, placeholder]);
        // Show a "New chat" row in the sidebar straight away. It is swapped for the real
        // chat (real id + generated title) when the answer arrives.
        const tempId = `temp-${stamp}`;
        setConversations((prev) => [
          { id: tempId, title: "New chat", created_at: new Date().toISOString(), pending: true },
          ...prev,
        ]);
        const data = await newChat(content, controller.signal);
        const ms = performance.now() - t0;
        const newId = String(data.conversation_id);
        const created = { id: data.conversation_id, title: data.title, created_at: new Date().toISOString() };
        setConversations((prev) =>
          prev.some((c) => c.id === tempId) ? prev.map((c) => (c.id === tempId ? created : c)) : [created, ...prev]
        );
        if (stillHere()) {
          justCreated.current = newId;
          setMessages([userMsg, { id: botId, role: "assistant", content: data.answer, ms }]);
          navigate(`/chat/${newId}`);
        }
      } else {
        // Follow-up: reply streams in piece by piece.
        setMessages((m) => [...m, userMsg, placeholder]);
        let stopped = false;
        try {
          await streamChat(
            activeId,
            content,
            (chunk) => {
              if (!stillHere()) return;
              setMessages((m) => m.map((x) => (x.id === botId ? { ...x, content: x.content + chunk } : x)));
            },
            controller.signal
          );
        } catch (e) {
          if (e.name === "AbortError") stopped = true;
          else throw e;
        } finally {
          const ms = performance.now() - t0;
          if (stillHere()) {
            setMessages((m) =>
              m
                .map((x) => (x.id === botId ? { ...x, streaming: false, ms, stopped } : x))
                .filter((x) => !(x.id === botId && !x.content && !stopped))
            );
          }
        }
      }
    } catch (e) {
      if (e.name === "AbortError") {
        // Stopped while the first answer was being prepared. The server may already have
        // created the chat, so look for it and attach to it.
        try {
          const list = await getConversations();
          setConversations(list);
          const created = list.find((c) => !knownIds.has(String(c.id)));
          if (stillHere()) {
            setMessages([userMsg, { id: botId, role: "assistant", content: "", stopped: true }]);
            if (created) {
              justCreated.current = String(created.id);
              navigate(`/chat/${created.id}`);
            }
          }
        } catch {
          /* ignore, the user stopped anyway */
        }
      } else if (stillHere()) {
        setError(e.message || "Something went wrong. Try again.");
        setInput((cur) => cur || content); // give the text back so nothing is lost
        if (isNew) {
          setMessages([]);
          setConversations((prev) => prev.filter((c) => !c.pending));
        }
      }
    } finally {
      abortRef.current = null;
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape" && sending) {
      stop();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const isEmpty = !activeId && messages.length === 0 && !loadingMsgs;
  const menuConv = menu ? conversations.find((c) => c.id === menu.id) : null;

  return (
    <>
      {sideOpen && <div className="icc-scrim" onClick={() => setSideOpen(false)} />}

      <aside
        className={`icc-side ${sideOpen ? "open" : ""} ${resizing ? "resizing" : ""}`}
        style={{ "--side-w": `${sideWidth}px` }}
        aria-label="Chats"
      >
        <div
          className="icc-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          aria-valuemin={SIDE_MIN}
          aria-valuemax={SIDE_MAX}
          aria-valuenow={sideWidth}
          tabIndex={0}
          title="Drag to resize, double-click to reset"
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          onKeyDown={keyResize}
          onDoubleClick={() => setSideWidth(SIDE_DEFAULT)}
        />
        <div className="icc-side-top">
          <Link to="/" className="icc-brand">
            IntelliChat
          </Link>
          <button
            type="button"
            className="icc-icon-btn"
            onClick={() => setSideOpen(false)}
            aria-label="Hide sidebar"
            title="Hide sidebar"
          >
            <SidebarIcon />
          </button>
        </div>

        <button type="button" className="icc-new" onClick={startNewChat}>
          <FaPlus aria-hidden="true" /> New chat
        </button>

        <div className="icc-list-title">Recent chats</div>
        <nav className="icc-list" aria-label="Recent chats">
          {loadingChats && <p className="icc-hint">Loading chats…</p>}
          {chatsError && <p className="icc-hint icc-error-text">{chatsError}</p>}
          {!loadingChats && !chatsError && conversations.length === 0 && (
            <p className="icc-hint">No chats yet. Send a message to start one.</p>
          )}
          {conversations.map((c) => (
            <ChatItem
              key={c.id}
              c={c}
              active={c.pending ? !activeId : String(c.id) === activeId}
              menuOpen={menu?.id === c.id}
              renaming={renamingId === c.id}
              onOpen={() => openConversation(c.id)}
              onMenu={(e) => openMenu(e, c)}
              onCommit={(v) => commitRename(c, v)}
              onCancel={() => setRenamingId(null)}
            />
          ))}
        </nav>

        <div className="icc-side-bottom">
          {userMenuOpen && (
            <div className="icc-menu icc-user-menu" role="menu">
              <div className="icc-menu-head" title={email}>
                {email}
              </div>
              <button type="button" role="menuitem" onClick={toggleTheme}>
                {theme !== "light" ? <FaSun /> : <FaMoon />}
                {theme !== "light" ? "Light theme" : "Dark theme"}
              </button>
              <div className="icc-menu-sep" />
              <button type="button" role="menuitem" className="danger" onClick={logout}>
                <FaSignOutAlt /> Log out
              </button>
              <button type="button" role="menuitem" className="danger" onClick={openDeleteAccount}>
                <FaUserTimes /> Delete account
              </button>
            </div>
          )}
          <button
            type="button"
            className="icc-user"
            data-menu-trigger
            onClick={() => {
              setMenu(null);
              setUserMenuOpen((o) => !o);
            }}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
          >
            <span className="icc-avatar" aria-hidden="true">
              {(email[0] || "?").toUpperCase()}
            </span>
            <span className="icc-email" title={email}>
              {email}
            </span>
            <FaChevronUp aria-hidden="true" className="icc-chev" />
          </button>
        </div>
      </aside>

      {menu && menuConv && (
        <div className="icc-menu" role="menu" style={{ left: menu.x, top: menu.y }}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setRenamingId(menuConv.id);
              setMenu(null);
            }}
          >
            <FaPen /> Rename
          </button>
          <button
            type="button"
            role="menuitem"
            className="danger"
            onClick={() => {
              setDeleteTarget(menuConv);
              setMenu(null);
            }}
          >
            <FaTrashAlt /> Delete
          </button>
        </div>
      )}

      {deleteTarget && (
        <div className="icc-modal-wrap" onMouseDown={() => !deleting && setDeleteTarget(null)}>
          <div
            className="icc-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Delete chat"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2>Delete this chat?</h2>
            <p>“{deleteTarget.title || "New chat"}” and all its messages will be deleted for good.</p>
            <div className="icc-modal-actions">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button type="button" className="danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {accountModal && (
        <div className="icc-modal-wrap" onMouseDown={() => !deletingAccount && setAccountModal(false)}>
          <div
            className="icc-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Delete account"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2>Delete your account?</h2>
            <p>
              {email} and all your chats and messages will be deleted for good. This can’t be undone.
            </p>
            {accountError && (
              <p className="icc-error-text" role="alert">
                {accountError}
              </p>
            )}
            <div className="icc-modal-actions">
              <button type="button" onClick={() => setAccountModal(false)} disabled={deletingAccount}>
                Cancel
              </button>
              <button type="button" className="danger" onClick={confirmDeleteAccount} disabled={deletingAccount}>
                {deletingAccount ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="icc-main">
        <header className="icc-topbar">
          {!sideOpen && (
            <>
              <button
                type="button"
                className="icc-icon-btn"
                onClick={() => setSideOpen(true)}
                aria-label="Show sidebar"
                title="Show sidebar"
              >
                <SidebarIcon />
              </button>
              <Link to="/" className="icc-brand">
                IntelliChat
              </Link>
            </>
          )}
        </header>

        <div className="icc-scroll" ref={scrollRef} onScroll={onScroll}>
          <div className="icc-thread">
            {isEmpty && (
              <div className="icc-empty">
                <h1 className="icc-empty-title">What can I help with?</h1>
                <p className="icc-empty-text">
                  Ask a question, or try one of these. I can search the web, check prices and
                  weather, and do the math.
                </p>
                <div className="icc-suggest">
                  {SUGGESTIONS.map((s) => (
                    <button type="button" key={s} onClick={() => send(s)} disabled={sending}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loadingMsgs && <p className="icc-hint">Loading messages…</p>}

            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="icc-msg user">
                  <div className="icc-bubble">
                    <FormattedText text={m.content} />
                  </div>
                </div>
              ) : (
                <div key={m.id} className="icc-msg bot">
                  <Mark busy={!!m.streaming} />
                  <div className="icc-bot-body">
                    {m.streaming && !m.content ? (
                      <Thinking startedAt={m.startedAt} />
                    ) : m.content ? (
                      <div className="icc-md">
                        <Answer text={m.content} />
                      </div>
                    ) : m.stopped ? (
                      <div className="icc-text icc-faint">Stopped before a reply.</div>
                    ) : null}
                    {!m.streaming && (m.content || m.stopped) && (
                      <div className="icc-actions">
                        {m.content && <CopyButton text={m.content} />}
                        {m.stopped ? (
                          <span className="icc-time">Stopped</span>
                        ) : (
                          m.ms != null && <span className="icc-time">Answered in {fmt(m.ms)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <div className="icc-composer-wrap">
          {error && (
            <div className="icc-banner" role="alert">
              {error}
            </div>
          )}
          <div className="icc-composer">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              placeholder="Message IntelliChat"
              aria-label="Message IntelliChat"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
            />
            {sending ? (
              <button
                type="button"
                className="icc-send icc-stop"
                onClick={stop}
                aria-label="Stop generating"
                title="Stop (Esc)"
              >
                <FaStop />
              </button>
            ) : (
              <button
                type="button"
                className="icc-send"
                onClick={() => send()}
                disabled={!input.trim()}
                aria-label="Send message"
              >
                <FaArrowUp />
              </button>
            )}
          </div>
          <p className="icc-foot">IntelliChat can make mistakes. Check important facts.</p>
        </div>
      </main>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* page wrapper                                                        */
/* ------------------------------------------------------------------ */

export default function Chat() {
  const { theme } = useTheme();
  return (
    <div className="icc-root" style={theme === "light" ? TOKENS.light : TOKENS.dark}>
      <style>{FONT_IMPORT + CSS}</style>
      <ChatApp />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* styles (scoped with the icc- prefix)                                */
/* ------------------------------------------------------------------ */

const CSS = `
/* z-index 1050 sits above the fixed Bootstrap navbar (1030), so the chat page is full screen */
.icc-root{position:fixed;inset:0;z-index:1050;display:flex;text-align:left;word-break:normal;background:var(--bg);color:var(--ink);
  font-family:"Hind",system-ui,-apple-system,"Segoe UI",sans-serif;font-size:16px;line-height:1.55}
.icc-root *{box-sizing:border-box}
.icc-root button,.icc-root textarea,.icc-root input{font:inherit;color:inherit}
.icc-root :focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.icc-root :is(h1,h2,h3,p,span,label,strong,li){color:var(--c,inherit)}

/* sidebar */
.icc-side{position:relative;width:var(--side-w,272px);flex:none;display:flex;flex-direction:column;background:var(--surface);
  border-right:1px solid var(--line);padding:14px 12px 12px}
.icc-resizer{position:absolute;top:0;right:-4px;bottom:0;width:8px;cursor:col-resize;z-index:4;touch-action:none}
.icc-resizer::after{content:"";position:absolute;top:0;bottom:0;left:3px;width:2px;background:transparent;transition:background .15s}
.icc-resizer:hover::after,.icc-resizer:focus-visible::after,.icc-side.resizing .icc-resizer::after{background:var(--accent)}
.icc-side.resizing{transition:none !important}
.icc-side.resizing ~ .icc-main{user-select:none;pointer-events:none}
.icc-side-top{display:flex;align-items:center;justify-content:space-between;padding:2px 6px 14px}
.icc-brand{font-family:"Bricolage Grotesque","Hind",system-ui,sans-serif;font-weight:800;
  font-size:1.25rem;letter-spacing:-.02em;color:var(--ink);text-decoration:none}
.icc-brand:hover{color:var(--ink)}
.icc-new{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border:1px solid var(--line);
  border-radius:10px;background:transparent;cursor:pointer;font-weight:600}
.icc-new:hover{background:var(--surface-2)}
.icc-list-title{margin:18px 8px 6px;font-size:.88rem;color:var(--muted);font-weight:500}
.icc-list{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:2px;scrollbar-width:thin}
.icc-hint{margin:6px 8px;--c:var(--muted);font-size:.92rem}
.icc-error-text{--c:var(--danger);margin:0;font-size:.92rem}
.icc-faint{color:var(--muted);font-style:italic}

/* chat rows */
.icc-row{display:flex;align-items:center;border-radius:8px}
.icc-row:hover,.icc-row.menu-open{background:var(--surface-2)}
.icc-row.active{background:var(--accent-soft)}
.icc-item{flex:1;min-width:0;text-align:left;padding:9px 10px;border:0;border-radius:8px;background:transparent;
  cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.icc-row.active .icc-item{font-weight:600}
.icc-more{flex:none;margin-right:4px;width:30px;height:30px;opacity:0}
.icc-row:hover .icc-more,.icc-row.active .icc-more,.icc-row.menu-open .icc-more,.icc-more:focus-visible{opacity:1}
@media (hover:none){.icc-more{opacity:1}}
.icc-row.pending .icc-item{color:var(--muted);font-style:italic;cursor:default}
.icc-rename{flex:1;min-width:0;margin:3px 4px;padding:6px 8px;border:1px solid var(--accent);
  border-radius:8px;background:var(--bg)}

/* popup menus */
.icc-menu{position:fixed;z-index:60;min-width:168px;padding:6px;border:1px solid var(--line);border-radius:12px;
  background:var(--surface);box-shadow:0 10px 30px rgba(0,0,0,.25)}
.icc-menu button{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;border:0;border-radius:8px;
  background:transparent;cursor:pointer;text-align:left}
.icc-menu button:hover{background:var(--surface-2)}
.icc-menu .danger{color:var(--danger)}
.icc-menu-sep{height:1px;margin:4px 2px;background:var(--line)}
.icc-menu-head{padding:6px 10px 4px;font-size:.85rem;color:var(--muted);overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}
.icc-user-menu{position:absolute;left:0;right:0;bottom:calc(100% + 8px);min-width:0}

/* user chip at the bottom */
.icc-side-bottom{position:relative;padding-top:10px;border-top:1px solid var(--line)}
.icc-user{display:flex;align-items:center;gap:10px;width:100%;padding:6px;border:0;border-radius:10px;
  background:transparent;cursor:pointer;text-align:left}
.icc-user:hover{background:var(--surface-2)}
.icc-avatar{flex:none;width:30px;height:30px;border-radius:50%;background:var(--accent);color:var(--accent-ink);--c:var(--accent-ink);
  display:grid;place-items:center;font-weight:700}
.icc-email{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.9rem}
.icc-chev{flex:none;color:var(--muted);font-size:.75rem}
.icc-icon-btn{display:inline-grid;place-items:center;width:34px;height:34px;border:0;border-radius:8px;
  background:transparent;cursor:pointer;color:var(--muted)}
.icc-icon-btn:hover{background:var(--surface-2);color:var(--ink)}

/* delete dialog */
.icc-modal-wrap{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.5)}
.icc-modal{width:100%;max-width:380px;padding:20px;border:1px solid var(--line);border-radius:16px;background:var(--surface)}
.icc-modal h2{margin:0 0 8px;font-size:1.2rem}
.icc-modal p{margin:0 0 18px;--c:var(--muted);overflow-wrap:break-word}
.icc-modal .icc-error-text{--c:var(--danger);margin:0 0 14px}
.icc-modal-actions{display:flex;justify-content:flex-end;gap:8px}
.icc-modal-actions button{padding:9px 16px;border:1px solid var(--line);border-radius:10px;background:transparent;cursor:pointer}
.icc-modal-actions button:disabled{opacity:.6;cursor:wait}
.icc-modal-actions .danger{background:var(--danger);border-color:var(--danger);color:#fff;font-weight:600}

/* main column */
.icc-main{flex:1;min-width:0;display:flex;flex-direction:column}
.icc-topbar{display:flex;align-items:center;gap:10px;height:52px;padding:0 16px;flex:none}
.icc-scroll{flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin}
.icc-thread{max-width:760px;margin:0 auto;padding:12px 20px 28px;display:flex;flex-direction:column;gap:22px;min-height:100%}

/* empty state */
.icc-empty{margin:auto;padding:6vh 0;text-align:center}
.icc-empty-title{font-family:"Bricolage Grotesque","Hind",system-ui,sans-serif;font-weight:800;
  font-size:clamp(1.8rem,4vw,2.5rem);letter-spacing:-.025em;line-height:1.1;margin:0 0 10px}
.icc-empty-text{margin:0 auto;max-width:30rem;--c:var(--muted)}
.icc-suggest{display:flex;flex-direction:column;gap:8px;max-width:30rem;margin:24px auto 0}
.icc-suggest button{text-align:left;padding:12px 14px;border:1px solid var(--line);border-radius:12px;
  background:var(--surface);cursor:pointer}
.icc-suggest button:hover:not(:disabled){border-color:var(--accent)}
.icc-suggest button:disabled{opacity:.5;cursor:not-allowed}

/* messages */
.icc-msg.user{align-self:flex-end;max-width:85%}
.icc-bubble{background:var(--surface-2);padding:10px 16px;border-radius:18px 18px 6px 18px;
  white-space:pre-wrap;overflow-wrap:break-word}
.icc-msg.bot{display:flex;gap:12px;align-items:flex-start}
.icc-mark{position:relative;flex:none;width:30px;height:30px;border-radius:9px;color:#fff;--c:#fff;margin-top:1px;
  background:linear-gradient(135deg,#FF7B00 0%,#5B2CF0 100%);display:grid;place-items:center}
.icc-mark svg{width:18px;height:18px}
.icc-mark.busy::after{content:"";position:absolute;inset:-4px;border-radius:12px;border:2px solid #FF7B00;
  opacity:0;animation:icc-ring 1.5s ease-out infinite}
@keyframes icc-ring{0%{transform:scale(.85);opacity:.7}100%{transform:scale(1.25);opacity:0}}
.icc-bot-body{min-width:0;flex:1}
.icc-text{white-space:pre-wrap;overflow-wrap:break-word}
.icc-md{overflow-wrap:break-word}
.icc-md>:first-child{margin-top:0}
.icc-md>:last-child{margin-bottom:0}
.icc-md p{margin:0 0 .8em}
.icc-md h1,.icc-md h2,.icc-md h3,.icc-md h4{margin:1.2em 0 .5em;line-height:1.25;font-weight:700}
.icc-md h1{font-size:1.45rem}.icc-md h2{font-size:1.25rem}.icc-md h3{font-size:1.1rem}.icc-md h4{font-size:1rem}
.icc-md ul,.icc-md ol{margin:0 0 .8em;padding-left:1.4em}
.icc-md li{margin:.25em 0}
.icc-md li>p{margin:0}
.icc-md a{color:var(--accent);text-decoration:underline}
.icc-md blockquote{margin:0 0 .8em;padding:.2em 1em;border-left:3px solid var(--accent);color:var(--muted)}
.icc-md hr{border:0;border-top:1px solid var(--line);margin:1.2em 0}
.icc-md code{padding:.15em .4em;border-radius:6px;background:var(--surface-2);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.88em}
.icc-code{margin:0 0 .9em;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface)}
.icc-code-head{display:flex;align-items:center;justify-content:space-between;padding:4px 6px 4px 12px;
  background:var(--surface-2);font-size:.8rem;--c:var(--muted)}
.icc-code pre{margin:0;padding:12px 14px;overflow-x:auto}
.icc-code pre code{padding:0;background:none;font-size:.88rem;white-space:pre}
.icc-table{margin:0 0 .9em;overflow-x:auto}
.icc-md table{border-collapse:collapse;min-width:60%}
.icc-md th,.icc-md td{padding:7px 12px;border:1px solid var(--line);text-align:left;overflow-wrap:normal;word-break:normal}
.icc-md th{background:var(--surface-2)}
.icc-thinking{display:inline-flex;align-items:center;gap:10px;padding:6px 0}
.icc-time{font-size:.82rem;--c:var(--muted);font-variant-numeric:tabular-nums}
.icc-actions{display:flex;align-items:center;gap:6px;margin-top:4px;margin-left:-8px}
.icc-actions .icc-time{margin-left:2px}
.icc-actions .icc-icon-btn{opacity:0;transition:opacity .15s}
.icc-msg.bot:hover .icc-actions .icc-icon-btn,.icc-actions .icc-icon-btn:focus-visible{opacity:1}
@media (hover:none){.icc-actions .icc-icon-btn{opacity:1}}

.icc-dots{display:inline-flex;gap:5px}
.icc-dots i{width:7px;height:7px;border-radius:50%;background:var(--muted);animation:icc-bounce 1.1s infinite ease-in-out}
.icc-dots i:nth-child(2){animation-delay:.15s}
.icc-dots i:nth-child(3){animation-delay:.3s}
@keyframes icc-bounce{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}

/* composer */
.icc-composer-wrap{flex:none;width:100%;max-width:760px;margin:0 auto;padding:0 20px 14px}
.icc-banner{margin-bottom:8px;padding:8px 12px;border-radius:10px;border:1px solid var(--danger);
  color:var(--danger);font-size:.92rem}
.icc-composer{display:flex;align-items:flex-end;gap:8px;background:var(--surface);border:1px solid var(--line);
  border-radius:18px;padding:8px 8px 8px 16px}
.icc-composer:focus-within{border-color:var(--accent)}
.icc-composer textarea{flex:1;border:0;resize:none;background:transparent;max-height:200px;padding:8px 0;line-height:1.5}
.icc-composer textarea:focus-visible{outline:0}
.icc-composer textarea::placeholder{color:var(--muted)}
.icc-send{flex:none;width:38px;height:38px;border:0;border-radius:12px;background:var(--accent);
  color:var(--accent-ink);display:grid;place-items:center;cursor:pointer}
.icc-send:disabled{opacity:.4;cursor:not-allowed}
.icc-send.icc-stop{background:var(--ink);color:var(--bg)}
.icc-foot{margin:8px 0 0;text-align:center;font-size:.8rem;--c:var(--muted)}

/* sidebar hide / show */
.icc-scrim{display:none}
@media (min-width:861px){
  .icc-side:not(.open){margin-left:calc(-1 * var(--side-w,272px));visibility:hidden;transition:margin-left .22s ease,visibility 0s .22s}
  .icc-side.open{transition:margin-left .22s ease}
}

/* phones and small tablets: sidebar slides over the chat */
@media (max-width:860px){
  .icc-side{position:absolute;top:0;bottom:0;left:0;z-index:3;width:min(300px,86vw);
    transform:translateX(-102%);visibility:hidden;transition:transform .22s ease,visibility 0s .22s}
  .icc-side.open{transform:none;visibility:visible;transition:transform .22s ease;box-shadow:0 0 40px rgba(0,0,0,.35)}
  .icc-scrim{display:block;position:absolute;inset:0;z-index:2;background:rgba(0,0,0,.45)}
  .icc-thread,.icc-composer-wrap{padding-left:14px;padding-right:14px}
  .icc-resizer{display:none}
}

@media (prefers-reduced-motion:reduce){
  .icc-root *{transition:none !important;animation:none !important}
}
`;
