/* ── script.js  —  AI Language Translator (CodeAlpha Premium) ────── */

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  const toastEl = document.getElementById("liveToast");
  const msgEl   = document.getElementById("toastMsg");
  if (!toastEl || !msgEl) return;
  msgEl.textContent = msg;
  toastEl.className = `toast align-items-center border-0 text-bg-${type}`;
  const toast = new bootstrap.Toast(toastEl, { delay: 2500 });
  toast.show();
}

// ── COPY TRANSLATION ──────────────────────────────────────────────────────────
function copyText() {
  const el = document.getElementById("translatedText");
  if (!el) return;
  navigator.clipboard.writeText(el.innerText)
    .then(() => showToast("✅ Copied to clipboard!"))
    .catch(() => showToast("❌ Copy failed", "danger"));
}

// ── LANGUAGE SWAP ─────────────────────────────────────────────────────────────
function swapLanguages() {
  const src = document.getElementById("sourceSelect");
  const tgt = document.getElementById("targetSelect");
  if (!src || !tgt) return;
  // Don't swap if source is "auto"
  if (src.value === "auto") {
    showToast("⚠️ Cannot swap — Auto Detect is selected", "warning");
    return;
  }
  const tmp  = src.value;
  src.value  = tgt.value;
  tgt.value  = tmp;

  // Also swap visible textarea content with output text
  const inputEl  = document.getElementById("inputText");
  const outputEl = document.getElementById("translatedText");
  if (inputEl && outputEl && outputEl.innerText.trim()) {
    const tmpText = inputEl.value;
    inputEl.value = outputEl.innerText;
    updateCharCount(inputEl.value.length);
    autoResizeTextarea(inputEl);
  }
}

// ── TEXT TO SPEECH ────────────────────────────────────────────────────────────
function speakText() {
  const el = document.getElementById("translatedText");
  if (!el) return;

  const text = el.innerText.trim();
  if (!text || window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    return;
  }

  const utter = new SpeechSynthesisUtterance(text);
  // Map selected target language code to BCP-47 locale
  const tgt = document.getElementById("targetSelect");
  if (tgt) utter.lang = tgt.value;
  utter.rate = 0.9;
  window.speechSynthesis.speak(utter);

  const btn = document.getElementById("speakBtn");
  if (btn) {
    btn.innerHTML = '<i class="bi bi-stop-circle-fill"></i>';
    utter.onend = () => { btn.innerHTML = '<i class="bi bi-volume-up-fill"></i>'; };
  }
}

// ── VOICE INPUT ───────────────────────────────────────────────────────────────
let recognition = null;
let isListening = false;

function startVoiceInput() {
  const voiceBtn = document.getElementById("voiceBtn");

  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    showToast("❌ Speech recognition not supported in this browser", "danger");
    return;
  }

  if (isListening) {
    recognition && recognition.stop();
    isListening = false;
    if (voiceBtn) voiceBtn.classList.remove("listening");
    return;
  }

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRec();

  const srcSelect = document.getElementById("sourceSelect");
  recognition.lang = (srcSelect && srcSelect.value !== "auto") ? srcSelect.value : "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    if (voiceBtn) voiceBtn.classList.add("listening");
    showToast("🎤 Listening… speak now", "info");
  };

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    const inputEl = document.getElementById("inputText");
    if (inputEl) {
      inputEl.value = transcript;
      updateCharCount(transcript.length);
      autoResizeTextarea(inputEl);
    }
    isListening = false;
    if (voiceBtn) voiceBtn.classList.remove("listening");
    showToast("✅ Voice captured!");
  };

  recognition.onerror = (e) => {
    isListening = false;
    if (voiceBtn) voiceBtn.classList.remove("listening");
    showToast(`❌ Error: ${e.error}`, "danger");
  };

  recognition.onend = () => {
    isListening = false;
    if (voiceBtn) voiceBtn.classList.remove("listening");
  };

  recognition.start();
}

// ── AUTO-RESIZE TEXTAREA ──────────────────────────────────────────────────────
function autoResizeTextarea(el) {
  if (!el) return;
  el.style.height = 'auto';            // collapse first
  const minH = 200;                    // minimum height in px
  el.style.height = Math.max(el.scrollHeight, minH) + 'px';
}

// ── CLEAR INPUT ───────────────────────────────────────────────────────────────
function clearInput() {
  const el = document.getElementById("inputText");
  if (el) {
    el.value = "";
    updateCharCount(0);
    autoResizeTextarea(el);
    el.focus();
  }
  const output = document.getElementById("outputArea");
  if (output) {
    output.innerHTML = '<span class="placeholder-text">Translation will appear here…</span>';
  }
  updateActionButtonsVisibility(false);
}

// ── CHAR COUNTER ──────────────────────────────────────────────────────────────
function updateCharCount(n) {
  const el = document.getElementById("charCount");
  if (el) {
    el.textContent = `${n} / 5000`;
    el.style.color = n > 4500 ? "var(--danger)" : "var(--text-muted)";
  }
}

// ── DOWNLOAD TXT ──────────────────────────────────────────────────────────────
function downloadTxt() {
  const form = document.getElementById("txtForm");
  if (form) form.submit();
}

// ── DARK / LIGHT THEME ────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("themeToggle");
  if (btn) {
    btn.innerHTML = theme === "dark"
      ? '<i class="bi bi-sun-fill"></i>'
      : '<i class="bi bi-moon-stars-fill"></i>';
  }
}

document.getElementById("themeToggle")?.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next    = current === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem("ca-theme", next);
});

// ── DYNAMIC ACTIONS ───────────────────────────────────────────────────────────
function updateActionButtonsVisibility(visible, text = "") {
  const wrapper = document.querySelector(".output-wrapper .textarea-actions");
  if (!wrapper) return;
  if (visible) {
    wrapper.innerHTML = `
      <button type="button" class="btn btn-sm btn-ghost" onclick="copyText()" title="Copy">
        <i class="bi bi-clipboard"></i>
      </button>
      <button type="button" class="btn btn-sm btn-ghost" onclick="speakText()" title="Speak" id="speakBtn">
        <i class="bi bi-volume-up-fill"></i>
      </button>
      <button type="button" class="btn btn-sm btn-ghost" onclick="downloadTxt()" title="Download TXT">
        <i class="bi bi-download"></i>
      </button>
    `;
    // Update hidden form
    let txtForm = document.getElementById("txtForm");
    if (!txtForm) {
      txtForm = document.createElement("form");
      txtForm.id = "txtForm";
      txtForm.action = "/export/txt";
      txtForm.method = "POST";
      txtForm.style.display = "none";
      txtForm.innerHTML = `<input type="hidden" name="text" id="txtContent" value="">`;
      document.body.appendChild(txtForm);
    }
    document.getElementById("txtContent").value = text;
  } else {
    wrapper.innerHTML = "";
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderHistoryList(historyArray, favoritesArray) {
  const container = document.getElementById("historyListContainer");
  const emptyState = document.getElementById("historyEmptyState");
  
  if (!historyArray || historyArray.length === 0) {
    if (container) container.innerHTML = "";
    if (emptyState) {
      emptyState.style.display = "block";
    } else {
      const historyTab = document.getElementById("historyTab");
      if (historyTab) {
        historyTab.innerHTML = `
          <div class="empty-state" id="historyEmptyState">
            <div class="empty-icon">📭</div>
            <p>No translations yet. Start translating!</p>
          </div>
        `;
      }
    }
    return;
  }
  
  if (emptyState) emptyState.style.display = "none";
  
  let listEl = container;
  if (!listEl) {
    const historyTab = document.getElementById("historyTab");
    if (historyTab) {
      historyTab.innerHTML = `<div class="history-list" id="historyListContainer"></div>`;
      listEl = document.getElementById("historyListContainer");
    }
  }
  
  if (!listEl) return;
  
  const favIds = new Set(favoritesArray.map(f => f.id));
  
  listEl.innerHTML = historyArray.map(item => {
    const isFav = favIds.has(item.id);
    const starClass = isFav ? "bi-star-fill text-warning" : "bi-star";
    return `
      <div class="history-card" data-id="${item.id}">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <span class="badge lang-badge">${item.source_lang} → ${item.target_lang}</span>
          <div class="d-flex gap-2 align-items-center">
            <button class="btn btn-icon-sm fav-btn" onclick="toggleFavorite('${item.id}', this)" title="Favorite">
              <i class="bi ${starClass}"></i>
            </button>
            <button class="btn btn-icon-danger-sm delete-btn" onclick="deleteHistoryItem('${item.id}', this.closest('.history-card'))" title="Delete">
              <i class="bi bi-trash3"></i>
            </button>
            <span class="text-muted small">${item.date}</span>
          </div>
        </div>
        <div class="row g-2">
          <div class="col-12 col-md-6">
            <div class="history-text source-text">${escapeHtml(item.source_text)}</div>
          </div>
          <div class="col-12 col-md-6">
            <div class="history-text translated-text">${escapeHtml(item.translated_text)}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function renderFavoritesList(favoritesArray) {
  const container = document.getElementById("favoritesListContainer");
  const emptyState = document.getElementById("favoritesEmptyState");
  
  if (!favoritesArray || favoritesArray.length === 0) {
    if (container) container.innerHTML = "";
    if (emptyState) {
      emptyState.style.display = "block";
    } else {
      const favoritesTab = document.getElementById("favoritesTab");
      if (favoritesTab) {
        favoritesTab.innerHTML = `
          <div class="empty-state" id="favoritesEmptyState">
            <div class="empty-icon">⭐</div>
            <p>No favorites yet. Star a translation to save it here!</p>
          </div>
        `;
      }
    }
    return;
  }
  
  if (emptyState) emptyState.style.display = "none";
  
  let listEl = container;
  if (!listEl) {
    const favoritesTab = document.getElementById("favoritesTab");
    if (favoritesTab) {
      favoritesTab.innerHTML = `<div class="history-list" id="favoritesListContainer"></div>`;
      listEl = document.getElementById("favoritesListContainer");
    }
  }
  
  if (!listEl) return;
  
  listEl.innerHTML = favoritesArray.map(item => {
    return `
      <div class="history-card fav-card" data-id="${item.id}">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <span class="badge lang-badge">${item.source_lang} → ${item.target_lang}</span>
          <div class="d-flex gap-2 align-items-center">
            <button class="btn btn-icon-danger-sm delete-btn" onclick="toggleFavorite('${item.id}', this.closest('.history-card'))" title="Remove Favorite">
              <i class="bi bi-trash3"></i>
            </button>
            <span class="text-muted small">${item.date}</span>
          </div>
        </div>
        <div class="row g-2">
          <div class="col-12 col-md-6">
            <div class="history-text source-text">${escapeHtml(item.source_text)}</div>
          </div>
          <div class="col-12 col-md-6">
            <div class="history-text translated-text">${escapeHtml(item.translated_text)}</div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function performTranslation() {
  const textEl = document.getElementById("inputText");
  const srcEl = document.getElementById("sourceSelect");
  const tgtEl = document.getElementById("targetSelect");
  const outputEl = document.getElementById("outputArea");
  
  if (!textEl || !outputEl) return;
  const text = textEl.value.trim();
  if (!text) {
    showToast("⚠️ Please enter text to translate.", "warning");
    return;
  }
  
  const source = srcEl ? srcEl.value : "auto";
  const target = tgtEl ? tgtEl.value : "en";
  
  outputEl.innerHTML = `
    <div class="d-flex justify-content-center align-items-center h-100 py-5">
      <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
        <span class="visually-hidden">Translating...</span>
      </div>
    </div>
  `;
  updateActionButtonsVisibility(false);
  
  fetch("/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text, source, target })
  })
  .then(res => {
    if (!res.ok) {
      return res.json().then(errData => { throw new Error(errData.error || "Translation failed"); });
    }
    return res.json();
  })
  .then(data => {
    if (data.success) {
      outputEl.innerHTML = `<span id="translatedText">${escapeHtml(data.translated_text)}</span>`;
      updateActionButtonsVisibility(true, data.translated_text);
      
      const navCount = document.getElementById("navCountBadge");
      if (navCount) navCount.innerHTML = `<i class="bi bi-database me-1"></i>${data.count} Translations`;
      
      const histTabBadge = document.getElementById("historyTabBadge");
      if (histTabBadge) histTabBadge.textContent = data.count;
      
      const favTabBadge = document.getElementById("favoritesTabBadge");
      if (favTabBadge) favTabBadge.textContent = data.favorites.length;
      
      renderHistoryList(data.history, data.favorites);
      renderFavoritesList(data.favorites);
      
      showToast("✨ Translated successfully!");
    } else {
      throw new Error("Translation failed");
    }
  })
  .catch(err => {
    outputEl.innerHTML = `<span class="text-danger"><i class="bi bi-exclamation-triangle-fill me-1"></i>Error: ${err.message}</span>`;
    showToast(`❌ ${err.message}`, "danger");
  });
}

function deleteHistoryItem(id, cardElement) {
  if (!cardElement) return;
  
  fetch(`/delete/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  })
  .then(res => {
    if (!res.ok) throw new Error("Delete failed");
    return res.json();
  })
  .then(data => {
    if (data.success) {
      cardElement.classList.add("fade-out");
      setTimeout(() => {
        cardElement.classList.add("slide-collapse");
        setTimeout(() => {
          cardElement.remove();
          const histContainer = document.getElementById("historyListContainer");
          if (histContainer && histContainer.children.length === 0) {
            renderHistoryList([], data.favorites);
          }
        }, 300);
      }, 300);
      
      const navCount = document.getElementById("navCountBadge");
      if (navCount) navCount.innerHTML = `<i class="bi bi-database me-1"></i>${data.count} Translations`;
      
      const histTabBadge = document.getElementById("historyTabBadge");
      if (histTabBadge) histTabBadge.textContent = data.count;
      
      const favTabBadge = document.getElementById("favoritesTabBadge");
      if (favTabBadge) favTabBadge.textContent = data.favorites.length;
      
      renderFavoritesList(data.favorites);
      showToast("🗑️ History item removed");
    }
  })
  .catch(err => {
    showToast("❌ Could not delete history item", "danger");
  });
}

function toggleFavorite(id, element) {
  fetch(`/favorite/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  })
  .then(res => {
    if (!res.ok) throw new Error("Favorite toggle failed");
    return res.json();
  })
  .then(data => {
    if (data.success) {
      renderFavoritesList(data.favorites);
      
      const favTabBadge = document.getElementById("favoritesTabBadge");
      if (favTabBadge) favTabBadge.textContent = data.favorites.length;
      
      const histCards = document.querySelectorAll(`#historyListContainer .history-card[data-id="${id}"]`);
      const favIds = new Set(data.favorites.map(f => f.id));
      const isFav = favIds.has(id);
      
      histCards.forEach(card => {
        const starBtn = card.querySelector(".fav-btn i");
        if (starBtn) {
          if (isFav) {
            starBtn.className = "bi bi-star-fill text-warning";
          } else {
            starBtn.className = "bi bi-star";
          }
        }
      });
      
      if (element && element.closest(".fav-card")) {
        const favCard = element.closest(".fav-card");
        favCard.classList.add("fade-out");
        setTimeout(() => {
          favCard.classList.add("slide-collapse");
          setTimeout(() => {
            favCard.remove();
            const favContainer = document.getElementById("favoritesListContainer");
            if (favContainer && favContainer.children.length === 0) {
              renderFavoritesList([]);
            }
          }, 300);
        }, 300);
      }
      
      if (isFav) {
        showToast("⭐ Added to favorites!");
      } else {
        showToast("⭐ Removed from favorites");
      }
    }
  })
  .catch(err => {
    showToast("❌ Could not update favorite status", "danger");
  });
}

function clearAllHistory() {
  if (!confirm("Are you sure you want to clear all history? This will not clear your favorites.")) return;
  
  fetch("/clear", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  })
  .then(res => {
    if (!res.ok) throw new Error("Clear failed");
    return res.json();
  })
  .then(data => {
    if (data.success) {
      const cards = document.querySelectorAll("#historyListContainer .history-card");
      cards.forEach(card => {
        card.classList.add("fade-out");
      });
      
      setTimeout(() => {
        cards.forEach(card => {
          card.classList.add("slide-collapse");
        });
        setTimeout(() => {
          renderHistoryList([], data.favorites);
        }, 300);
      }, 300);
      
      const navCount = document.getElementById("navCountBadge");
      if (navCount) navCount.innerHTML = `<i class="bi bi-database me-1"></i>0 Translations`;
      
      const histTabBadge = document.getElementById("historyTabBadge");
      if (histTabBadge) histTabBadge.textContent = 0;
      
      showToast("🗑️ History cleared!");
    }
  })
  .catch(err => {
    showToast("❌ Could not clear history", "danger");
  });
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {

  // Restore theme
  const saved = localStorage.getItem("ca-theme") || "dark";
  applyTheme(saved);

  // Char counter, auto-resize and output clearing on input
  const textArea = document.getElementById("inputText");
  if (textArea) {
    updateCharCount(textArea.value.length);
    autoResizeTextarea(textArea); // resize on initial load if pre-filled
    textArea.addEventListener("input", (e) => {
      const val = e.target.value;
      updateCharCount(val.length);
      autoResizeTextarea(e.target); // grow/shrink as user types
      if (!val.trim()) {
        const output = document.getElementById("outputArea");
        if (output) {
          output.innerHTML = '<span class="placeholder-text">Translation will appear here…</span>';
        }
        updateActionButtonsVisibility(false);
      }
    });
  }

  // Auto-focus textarea on load
  if (textArea) textArea.focus();

  // Handle AJAX form translation submission
  const translateForm = document.getElementById("translateForm");
  if (translateForm) {
    translateForm.addEventListener("submit", (e) => {
      e.preventDefault();
      performTranslation();
    });
  }

  // Keyboard shortcut: Ctrl+Enter to translate
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      performTranslation();
    }
  });

  // Pressing Enter in search input auto-submits
  document.querySelector('.glass-input[name="search"]')
    ?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") e.target.closest("form")?.submit();
    });
});
