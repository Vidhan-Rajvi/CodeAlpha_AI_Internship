/* ═══════════════════════════════════════════════════════════════════
   script.js  —  AI FAQ Chatbot Pro (CodeAlpha)
   ═══════════════════════════════════════════════════════════════════ */

// ── State ──────────────────────────────────────────────────────────────────────
let activeCategory = "All";
let isWaitingResponse = false;
let recognition = null;
let isListening = false;
let ttsEnabled = true;
let questionCount = parseInt(document.getElementById("statQuestions")?.textContent || "0");

// ── Toast ──────────────────────────────────────────────────────────────────────
function showToast(msg, type = "primary") {
  const toastEl = document.getElementById("liveToast");
  const msgEl   = document.getElementById("toastMsg");
  if (!toastEl || !msgEl) return;
  msgEl.textContent = msg;
  toastEl.className = `toast align-items-center border-0 text-bg-${type}`;
  new bootstrap.Toast(toastEl, { delay: 2500 }).show();
}

// ── Theme ──────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("themeToggle");
  if (btn) btn.innerHTML = theme === "dark"
    ? '<i class="bi bi-sun-fill"></i>'
    : '<i class="bi bi-moon-stars-fill"></i>';
}

document.getElementById("themeToggle")?.addEventListener("click", () => {
  const cur  = document.documentElement.getAttribute("data-theme") || "dark";
  const next = cur === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem("faq-theme", next);
});

// ── Sidebar toggle (mobile) ────────────────────────────────────────────────────
document.getElementById("sidebarToggle")?.addEventListener("click", () => {
  document.getElementById("sidebar")?.classList.toggle("open");
});

// ── Scroll to bottom ───────────────────────────────────────────────────────────
function scrollBottom() {
  const win = document.getElementById("chatWindow");
  if (win) win.scrollTo({ top: win.scrollHeight, behavior: "smooth" });
}

// ── Auto-resize textarea ───────────────────────────────────────────────────────
const userInput = document.getElementById("userInput");
userInput?.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = Math.min(this.scrollHeight, 120) + "px";
});

// ── Enter to send ──────────────────────────────────────────────────────────────
userInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// ── Category filter (sidebar) ──────────────────────────────────────────────────
document.querySelectorAll(".cat-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
    activeCategory = this.dataset.cat;
    // Sync the select in input bar
    const sel = document.getElementById("categorySelect");
    if (sel) sel.value = activeCategory;
    showToast(`📂 Filtering: ${activeCategory === "All" ? "All Categories" : activeCategory}`, "secondary");
    // Close sidebar on mobile
    document.getElementById("sidebar")?.classList.remove("open");
  });
});

document.getElementById("categorySelect")?.addEventListener("change", function () {
  activeCategory = this.value;
  document.querySelectorAll(".cat-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.cat === activeCategory);
  });
});

// ── Suggested questions (sidebar pills) ───────────────────────────────────────
document.querySelectorAll(".suggestion-pill").forEach(pill => {
  pill.addEventListener("click", function () {
    const q = this.dataset.question;
    if (userInput) userInput.value = q;
    sendMessage();
    document.getElementById("sidebar")?.classList.remove("open");
  });
});

// ── Render message helper ──────────────────────────────────────────────────────
function getConfidenceColor(pct) {
  if (pct >= 70) return "#22c55e";
  if (pct >= 40) return "#f59e0b";
  return "#ef4444";
}

function renderUserMessage(text) {
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const row = document.createElement("div");
  row.className = "msg-row user-row";
  row.innerHTML = `
    <div class="user-avatar">👤</div>
    <div class="msg-bubble user-bubble">
      <div class="msg-text">${escHtml(text)}</div>
      <div class="msg-meta">
        <span class="msg-time">${now}</span>
      </div>
    </div>`;
  return row;
}

function renderBotMessage(data) {
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const pct  = data.confidence || 0;
  const color = getConfidenceColor(pct);

  let confidenceHtml = "";
  if (pct > 0) {
    confidenceHtml = `
      <div class="confidence-bar-wrap">
        <div class="confidence-label">Confidence: <strong>${pct}%</strong></div>
        <div class="confidence-bar">
          <div class="confidence-fill" style="width:${pct}%;background:${color}"></div>
        </div>
      </div>`;
  }

  let metaBadges = "";
  if (data.category) {
    metaBadges += `<span class="cat-tag">${data.emoji || ""} ${data.category}</span>`;
  }
  if (data.matched_question) {
    metaBadges += `<span class="matched-q">Matched: "${escHtml(data.matched_question)}"</span>`;
  }

  let suggestionsHtml = "";
  if (data.suggestions && data.suggestions.length) {
    const chips = data.suggestions.map(s =>
      `<span class="suggestion-chip" onclick="sendSuggestion('${escAttr(s)}')">${escHtml(s)}</span>`
    ).join("");
    suggestionsHtml = `
      <div class="bot-suggestions">
        <p>🤔 Did you mean?</p>
        ${chips}
      </div>`;
  }

  let favBtnHtml = "";
  if (data.found && data.matched_question) {
    const qAttr = escAttr(data.matched_question);
    const aAttr = escAttr(data.answer);
    favBtnHtml = `<button class="fav-btn" title="Save to favorites"
      onclick="toggleFavorite(this, '${qAttr}', '${aAttr}')">
      <i class="bi bi-star"></i></button>`;
  }

  const row = document.createElement("div");
  row.className = "msg-row bot-row";
  row.innerHTML = `
    <div class="bot-avatar">${data.emoji || "🤖"}</div>
    <div class="msg-bubble bot-bubble">
      <div class="msg-text">${escHtml(data.answer)}</div>
      ${suggestionsHtml}
      ${confidenceHtml}
      <div class="msg-meta">
        <span class="msg-time">${now}</span>
        ${metaBadges}
        ${favBtnHtml}
      </div>
    </div>`;
  return row;
}

// ── Send message ───────────────────────────────────────────────────────────────
async function sendMessage() {
  if (isWaitingResponse) return;

  const input = document.getElementById("userInput");
  const text  = (input?.value || "").trim();
  if (!text) return;

  // Display user message
  const chatWin = document.getElementById("chatWindow");
  chatWin.appendChild(renderUserMessage(text));
  input.value = "";
  if (input) { input.style.height = "auto"; }
  scrollBottom();

  // Update stats
  questionCount++;
  const statEl = document.getElementById("statQuestions");
  if (statEl) statEl.textContent = questionCount;

  // Show typing
  isWaitingResponse = true;
  document.getElementById("sendBtn").disabled = true;
  const typingEl = document.getElementById("typingIndicator");
  if (typingEl) {
    typingEl.style.display = "flex";
    chatWin.appendChild(typingEl);
    scrollBottom();
  }

  // Simulate slight delay for realism
  await new Promise(r => setTimeout(r, 600 + Math.random() * 600));

  try {
    const res  = await fetch("/chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ message: text, category: activeCategory }),
    });
    const data = await res.json();

    // Remove typing
    if (typingEl) typingEl.style.display = "none";

    // Display bot message
    const botRow = renderBotMessage(data);
    chatWin.appendChild(botRow);
    scrollBottom();

    // TTS if enabled
    if (ttsEnabled && data.found && data.answer) {
      speakText(data.answer);
    }

  } catch (err) {
    if (typingEl) typingEl.style.display = "none";
    const errRow = document.createElement("div");
    errRow.className = "msg-row bot-row";
    errRow.innerHTML = `<div class="bot-avatar">⚠️</div>
      <div class="msg-bubble bot-bubble"><div class="msg-text">Connection error. Please try again.</div></div>`;
    chatWin.appendChild(errRow);
    scrollBottom();
  } finally {
    isWaitingResponse = false;
    document.getElementById("sendBtn").disabled = false;
    input?.focus();
  }
}

// ── Suggestion chip click ──────────────────────────────────────────────────────
function sendSuggestion(question) {
  const input = document.getElementById("userInput");
  if (input) input.value = question;
  sendMessage();
}

// ── Clear chat ─────────────────────────────────────────────────────────────────
async function clearChat() {
  if (!confirm("Clear all chat history?")) return;
  await fetch("/chat/clear", { method: "POST" });
  const win = document.getElementById("chatWindow");
  // Remove all messages except welcome and typing indicator
  Array.from(win.children).forEach(child => {
    if (child.id !== "welcomeMsg" && child.id !== "typingIndicator") child.remove();
  });
  questionCount = 0;
  const statEl = document.getElementById("statQuestions");
  if (statEl) statEl.textContent = "0";
  showToast("🗑️ Chat cleared", "secondary");
}

// ── Favorites ──────────────────────────────────────────────────────────────────
async function toggleFavorite(btn, question, answer) {
  const res  = await fetch("/favorite", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ question, answer }),
  });
  const data = await res.json();

  if (data.action === "added") {
    btn.innerHTML = '<i class="bi bi-star-fill"></i>';
    btn.classList.add("faved");
    showToast("⭐ Added to favorites!", "warning");
  } else {
    btn.innerHTML = '<i class="bi bi-star"></i>';
    btn.classList.remove("faved");
    showToast("Removed from favorites", "secondary");
  }

  // Update badge
  const badge = document.getElementById("favBadge");
  const statEl = document.getElementById("statFavorites");
  if (badge)  badge.textContent = data.count;
  if (statEl) statEl.textContent = data.count;

  loadFavorites();
}

async function loadFavorites() {
  const res  = await fetch("/favorites");
  const data = await res.json();
  const list = document.getElementById("favoritesList");
  if (!list) return;

  if (!data.favorites.length) {
    list.innerHTML = '<div style="font-size:0.8rem;color:var(--text-muted);padding:4px">No favorites yet</div>';
    return;
  }

  list.innerHTML = data.favorites.map(f => `
    <div class="fav-item" onclick="sendSuggestion('${escAttr(f.question)}')">
      <div class="fav-q">${escHtml(f.question)}</div>
      <div class="fav-a">${escHtml(f.answer)}</div>
    </div>`).join("");
}

// ── Add FAQ (Admin Panel) ──────────────────────────────────────────────────────
document.getElementById("newCat")?.addEventListener("change", function () {
  const customInput = document.getElementById("newCatCustom");
  if (customInput) customInput.style.display = this.value === "__new__" ? "block" : "none";
});

async function submitAddFaq() {
  let category = document.getElementById("newCat")?.value;
  if (category === "__new__") {
    category = document.getElementById("newCatCustom")?.value.trim();
  }
  const question = document.getElementById("newQuestion")?.value.trim();
  const answer   = document.getElementById("newAnswer")?.value.trim();

  if (!category || !question || !answer) {
    showToast("⚠️ All fields are required", "warning");
    return;
  }

  const res  = await fetch("/add_faq", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ category, question, answer }),
  });
  const data = await res.json();

  if (data.success) {
    showToast(`✅ FAQ added! Total: ${data.total}`, "success");
    bootstrap.Modal.getInstance(document.getElementById("addFaqModal"))?.hide();
    document.getElementById("newQuestion").value = "";
    document.getElementById("newAnswer").value   = "";
  } else {
    showToast(`❌ ${data.error}`, "danger");
  }
}

// ── FAQ Search ─────────────────────────────────────────────────────────────────
document.getElementById("searchToggle")?.addEventListener("click", () => {
  const wrapper = document.getElementById("searchBarWrapper");
  if (!wrapper) return;
  const visible = wrapper.style.display !== "none";
  wrapper.style.display = visible ? "none" : "block";
  if (!visible) document.getElementById("faqSearchInput")?.focus();
});

document.getElementById("searchClose")?.addEventListener("click", () => {
  const wrapper = document.getElementById("searchBarWrapper");
  if (wrapper) wrapper.style.display = "none";
});

let searchTimer;
document.getElementById("faqSearchInput")?.addEventListener("input", function () {
  clearTimeout(searchTimer);
  const q = this.value.trim();
  if (!q) {
    document.getElementById("searchResults").innerHTML = "";
    return;
  }
  searchTimer = setTimeout(() => doSearch(q), 250);
});

async function doSearch(q) {
  const res   = await fetch(`/search?q=${encodeURIComponent(q)}`);
  const data  = await res.json();
  const list  = document.getElementById("searchResults");
  if (!list) return;

  if (!data.results.length) {
    list.innerHTML = `<div style="padding:10px;color:var(--text-muted);font-size:0.85rem">No results for "${escHtml(q)}"</div>`;
    return;
  }

  list.innerHTML = data.results.map(f => `
    <div class="search-result-item" onclick="useSearchResult('${escAttr(f.question)}')">
      <div class="search-result-q">${escHtml(f.question)}</div>
      <div class="search-result-a">${escHtml(f.answer)}</div>
    </div>`).join("");
}

function useSearchResult(question) {
  const input = document.getElementById("userInput");
  if (input) input.value = question;
  document.getElementById("searchBarWrapper").style.display = "none";
  sendMessage();
}

// ── Voice Input ────────────────────────────────────────────────────────────────
function startVoice() {
  const btn = document.getElementById("voiceBtn");
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    showToast("❌ Speech recognition not supported", "danger");
    return;
  }
  if (isListening) {
    recognition?.stop();
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    btn?.classList.add("listening");
    showToast("🎤 Listening… speak now", "info");
  };
  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    if (userInput) userInput.value = transcript;
    isListening = false;
    btn?.classList.remove("listening");
    showToast("✅ Voice captured!");
    sendMessage();
  };
  recognition.onerror = (e) => {
    isListening = false;
    btn?.classList.remove("listening");
    showToast(`❌ Voice error: ${e.error}`, "danger");
  };
  recognition.onend = () => {
    isListening = false;
    btn?.classList.remove("listening");
  };
  recognition.start();
}

// ── Text to Speech ─────────────────────────────────────────────────────────────
function speakText(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utter  = new SpeechSynthesisUtterance(text.slice(0, 300));
  utter.rate   = 0.9;
  utter.pitch  = 1;
  window.speechSynthesis.speak(utter);
}

// ── HTML Escape helpers ────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escAttr(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// ── Local Storage backup ───────────────────────────────────────────────────────
function backupToLocalStorage() {
  try {
    const msgs = [];
    document.querySelectorAll(".msg-row").forEach(row => {
      if (row.id === "welcomeMsg" || row.id === "typingIndicator") return;
      const isUser = row.classList.contains("user-row");
      const text = row.querySelector(".msg-text")?.innerText || "";
      msgs.push({ role: isUser ? "user" : "bot", text });
    });
    localStorage.setItem("faq-chat-backup", JSON.stringify(msgs));
  } catch (_) {}
}

// ── Init ───────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Theme
  const saved = localStorage.getItem("faq-theme") || "dark";
  applyTheme(saved);

  // Load favorites
  loadFavorites();

  // Focus input
  userInput?.focus();

  // Auto-backup every 30s
  setInterval(backupToLocalStorage, 30000);

  // Close sidebar on outside click (mobile)
  document.addEventListener("click", (e) => {
    const sidebar = document.getElementById("sidebar");
    const toggle  = document.getElementById("sidebarToggle");
    if (sidebar?.classList.contains("open") &&
        !sidebar.contains(e.target) &&
        !toggle?.contains(e.target)) {
      sidebar.classList.remove("open");
    }
  });
});
