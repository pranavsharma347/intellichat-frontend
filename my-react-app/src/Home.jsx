import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "./ThemeContext";
import pranavImg from "./images/pranav.png";

import {
  FaLinkedin,
  FaGithub,
  FaFacebook,
  FaInstagram,
} from "react-icons/fa";

const FEATURES = [
  {
    icon: "⚡",
    title: "Answers as they're written",
    text: "Replies stream in word by word, so you never stare at a blank screen.",
  },
  {
    icon: "🌐",
    title: "Current, not just remembered",
    text: "Need something recent? IntelliChat searches the web and brings back up-to-date answers.",
  },
  {
    icon: "🌤️",
    title: "Weather, prices and time",
    text: "Ask about the weather in your city, a stock's latest price, or the time anywhere.",
  },
  {
    icon: "🧮",
    title: "Calculations done exactly",
    text: "Sums, percentages and conversions are calculated, not guessed.",
  },
  {
    icon: "🗂️",
    title: "Pick up where you left off",
    text: "Every chat is saved with a clear title, so any conversation is one click away.",
  },
  {
    icon: "🔒",
    title: "Your chats stay yours",
    text: "Conversations are private to your account and sit behind your own login.",
  },
];

const QUESTION = "What's the weather in Delhi, and what is 18% of 2,450?";
const REPLY = "Delhi is 31°C and clear right now. 18% of 2,450 is 441.";

// Types the demo reply once on page load (skipped if reduced motion is on)
function useTyped(text) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(text.length);
      return;
    }
    const id = setInterval(() => {
      setCount((n) => {
        if (n >= text.length) {
          clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, 35);
    return () => clearInterval(id);
  }, [text]);
  return text.slice(0, count);
}

function Home() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const typed = useTyped(REPLY);

  // 🔐 AUTH CHECK (token key same as your login code: "access_token")
  const isAuthenticated = () => !!localStorage.getItem("access_token");

  // 🔒 PROTECTED NAVIGATION
  const handleProtectedClick = (path) => {
    if (!isAuthenticated()) {
      navigate("/login", { state: { from: path } });
    } else {
      navigate(path);
    }
  };

  // Theme based styles
  const bg = theme === "light" ? "#FFFFFF" : "#0D0D0D";
  const text = theme === "light" ? "#000000" : "#FFFFFF";
  const cardBg = theme === "light" ? "#F7F7F7" : "#1A1A1A";
  const secondaryText = theme === "light" ? "#555" : "#CCCCCC";
  const border = theme === "light" ? "#E2E2E2" : "#2A2A33";
  const altBg = theme === "light" ? "#F4F4F4" : "#111111";
  const outlineBtn = theme === "light" ? "btn-outline-dark" : "btn-outline-light";

  return (
    <main
      className="mt-5 pt-5"
      style={{ backgroundColor: bg, color: text, transition: "0.3s" }}
    >
      {/* HERO SECTION */}
      <section className="py-5">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6 text-center text-lg-start">
              <h1 className="fw-bold display-5 mb-3">
                Ask anything. Get answers that are actually current.
              </h1>

              <p className="fs-5 mb-4" style={{ color: secondaryText }}>
                An AI assistant that searches the web, checks live prices and
                remembers your conversations.
              </p>

              <div className="d-flex justify-content-center justify-content-lg-start gap-3 flex-wrap mt-4">
                <button
                  onClick={() => handleProtectedClick("/chat")}
                  className="btn btn-lg px-4 fw-bold text-white ui-btn"
                  style={{ backgroundColor: "#FF7B00", borderRadius: "40px" }}
                >
                  💬 Start Chatting
                </button>

                <a
                  href="#features"
                  className={`btn btn-lg px-4 fw-bold ui-btn ${outlineBtn}`}
                  style={{ borderRadius: "40px" }}
                >
                  ✨ See What It Can Do
                </a>
              </div>
            </div>

            {/* SAMPLE CHAT */}
            <div className="col-lg-6">
              <div
                className="p-4 d-flex flex-column gap-3"
                style={{
                  backgroundColor: cardBg,
                  border: `1px solid ${border}`,
                  borderRadius: "20px",
                  minHeight: "300px",
                }}
                aria-label="Sample conversation"
              >
                <small style={{ color: secondaryText }}>Sample conversation</small>

                <div
                  className="align-self-end px-3 py-2 text-white"
                  style={{
                    backgroundColor: "#5B2CF0",
                    borderRadius: "16px 16px 4px 16px",
                    maxWidth: "88%",
                  }}
                >
                  {QUESTION}
                </div>

                <div className="d-flex gap-2 flex-wrap">
                  {["Used weather", "Used calculator"].map((t) => (
                    <span
                      key={t}
                      className="px-3"
                      style={{
                        fontSize: "0.82rem",
                        color: secondaryText,
                        border: `1px solid ${border}`,
                        borderRadius: "999px",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div
                  className="align-self-start px-3 py-2"
                  style={{
                    border: `1px solid ${border}`,
                    borderRadius: "16px 16px 16px 4px",
                    maxWidth: "88%",
                    minHeight: "3.2em",
                  }}
                >
                  {typed}
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-block",
                      width: "2px",
                      height: "1.1em",
                      marginLeft: "2px",
                      verticalAlign: "text-bottom",
                      backgroundColor: "#FF7B00",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-5" id="features">
        <div className="container">
          <h2 className="fw-bold text-center mb-5">What IntelliChat Can Do</h2>
          <div className="row g-4">
            {FEATURES.map((f) => (
              <div className="col-md-6 col-lg-4" key={f.title}>
                <div
                  className="card h-100 text-center p-4 shadow-lg border-0"
                  style={{ backgroundColor: cardBg }}
                >
                  <div className="fs-1 mb-3">{f.icon}</div>
                  <h5 className="fw-bold">{f.title}</h5>
                  <p style={{ color: secondaryText }}>{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-5" style={{ backgroundColor: altBg }}>
        <div className="container text-center">
          <h2 className="fw-bold mb-4">How It Works</h2>
          <ol className="list-unstyled fs-5" style={{ color: secondaryText }}>
            <li className="mb-2">1️⃣ Sign up and log in</li>
            <li className="mb-2">2️⃣ Start a chat and ask anything</li>
            <li className="mb-2">3️⃣ Come back later, your chats are saved</li>
          </ol>
        </div>
      </section>

      {/* USE CASES */}
      <section className="py-5 text-center">
        <div className="container">
          <h2 className="fw-bold mb-4">Who Can Use It?</h2>
          <ul className="list-unstyled fs-5" style={{ color: secondaryText }}>
            <li>✔ Students with quick questions</li>
            <li>✔ Developers who need a fast calculation or lookup</li>
            <li>✔ Job seekers preparing for interviews</li>
            <li>✔ Anyone who wants an answer that is up to date</li>
          </ul>
        </div>
      </section>

      {/* FOUNDER SECTION */}
      <section className="py-5" style={{ backgroundColor: altBg }}>
        <div className="container">
          <div className="row align-items-center justify-content-between">
            {/* IMAGE SIDE (mobile first) */}
            <div className="col-md-5 order-1 order-md-2 text-center mb-4 mb-md-0">
              <img
                src={pranavImg}
                alt="Pranav Datta Sharma"
                className="img-fluid"
                style={{ width: "260px", borderRadius: "90px" }}
              />
            </div>

            {/* TEXT SIDE */}
            <div className="col-md-6 order-2 order-md-1">
              <h2 className="fw-bold display-6 mb-3" style={{ color: "#FF7B00" }}>
                Why I Built IntelliChat
              </h2>

              <p className="fs-5" style={{ color: text }}>
                I’m <b>Pranav Datta Sharma</b>, a backend and AI engineer. I
                wanted to see how far a chatbot gets when it can use real tools
                and keep every conversation private.
              </p>

              <p className="fs-6" style={{ color: secondaryText }}>
                Software Engineer | Python • FastAPI • LangGraph • Gemini • Generative AI
              </p>

              {/* SOCIAL ICON BUTTONS */}
              <div className="mt-3 d-flex flex-wrap gap-3">
                <a
                  href="https://www.linkedin.com/in/pranav-sharma98"
                  className={`btn rounded-pill px-3 d-flex align-items-center gap-2 ${outlineBtn}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FaLinkedin size={18} /> LinkedIn
                </a>

                <a
                  href="https://github.com/pranavsharma347/"
                  className={`btn rounded-pill px-3 d-flex align-items-center gap-2 ${outlineBtn}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FaGithub size={18} /> GitHub
                </a>

                <a
                  href="https://www.facebook.com/pranav.sharma.12576/"
                  className={`btn rounded-pill px-3 d-flex align-items-center gap-2 ${outlineBtn}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FaFacebook size={18} /> Facebook
                </a>

                <a
                  href="https://www.instagram.com/pranavsharma886/"
                  className={`btn rounded-pill px-3 d-flex align-items-center gap-2 ${outlineBtn}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FaInstagram size={18} /> Instagram
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
