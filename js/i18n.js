// ============================================================
// iVote — i18n.js  (WORKING FINAL)
//
// Uses Google Translate's internal doGTranslate() function which is
// the ONLY method that reliably translates in-page without a reload.
// Falls back to the .goog-te-combo select if doGTranslate is not ready.
//
// Rules:
//   1. Fresh open → always English, no auto-translate
//   2. User picks language → instant translation, no reload
//   3. User picks English → instant restore, no reload
//   4. googtrans cookie is ALWAYS cleared on fresh open to prevent
//      Firebase CDN from serving a pre-translated cached page
// ============================================================

const GT_LANGS = [
  { code: 'en',    label: 'English'   },
  { code: 'hi',    label: 'हिन्दी'     },
  { code: 'bn',    label: 'বাংলা'      },
  { code: 'es',    label: 'Español'   },
  { code: 'fr',    label: 'Français'  },
  { code: 'de',    label: 'Deutsch'   },
  { code: 'zh-CN', label: '中文'       },
  { code: 'ar',    label: 'العربية'   },
  { code: 'ru',    label: 'Русский'   },
  { code: 'pt',    label: 'Português' },
  { code: 'ja',    label: '日本語'     },
];

const LS_KEY = 'ivote_language'; // localStorage — last chosen language

// ─── Always nuke the googtrans cookie immediately on script load ──
// This is the fix for "auto-translates to Bengali on open".
// Firebase serves the page fresh each time; the cookie was persisting
// from a previous session and triggering GT before we could stop it.
(function clearGTCookieImmediately() {
  const exp = 'expires=Thu, 01 Jan 1970 00:00:00 UTC';
  document.cookie = `googtrans=; ${exp}; path=/`;
  document.cookie = `googtrans=; ${exp}; domain=${location.hostname}; path=/`;
  document.cookie = `googtrans=; ${exp}; domain=.${location.hostname}; path=/`;
})();

// ─── Translate using GT's own internal function ───────────────
// doGTranslate('en|hi') is what GT's own buttons call internally.
// It works instantly without any reload.
function _doTranslate(targetCode) {
  // doGTranslate expects 'sourceLang|targetLang'
  const pair = `en|${targetCode}`;

  // Method 1: GT's internal global function (most reliable)
  if (typeof doGTranslate === 'function') {
    doGTranslate(pair);
    return true;
  }

  // Method 2: Drive the hidden combo select
  const combo = document.querySelector('.goog-te-combo');
  if (combo) {
    combo.value = targetCode;
    combo.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  return false; // GT widget not ready yet
}

// ─── Restore English using GT's own restore mechanism ─────────
function _doRestoreEnglish() {
  // Method 1: doGTranslate to 'en'
  if (typeof doGTranslate === 'function') {
    doGTranslate('en|en');
  }

  // Method 2: drive combo to 'en'
  const combo = document.querySelector('.goog-te-combo');
  if (combo) {
    combo.value = 'en';
    combo.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Method 3: click the "Show original" link in GT bar if visible
  try {
    const bar = document.querySelector('.goog-te-banner-frame');
    if (bar) {
      const restore = bar.contentDocument.querySelector('a.restore');
      if (restore) restore.click();
    }
  } catch (e) {}
}

// ─── Main public function: called when user picks a language ──
let _pendingLang  = null;
let _retryHandle  = null;

function selectLanguage(code) {
  localStorage.setItem(LS_KEY, code);
  _syncUI(code);

  if (code === 'en') {
    _pendingLang = null;
    if (_retryHandle) { clearInterval(_retryHandle); _retryHandle = null; }
    _doRestoreEnglish();
    return;
  }

  // Try immediately; if GT widget isn't ready yet, retry until it is
  if (_doTranslate(code)) {
    _pendingLang = null;
    return;
  }

  // GT not ready — keep retrying every 300ms (max 20s)
  _pendingLang = code;
  if (_retryHandle) clearInterval(_retryHandle);
  let attempts = 0;
  _retryHandle = setInterval(() => {
    attempts++;
    if (_doTranslate(_pendingLang)) {
      clearInterval(_retryHandle);
      _retryHandle  = null;
      _pendingLang  = null;
    }
    if (attempts > 66) { // 66 × 300ms = ~20s, give up
      clearInterval(_retryHandle);
      _retryHandle = null;
    }
  }, 300);
}

// ─── Called on DOMContentLoaded ───────────────────────────────
function applySavedLanguage() {
  // Always start English on fresh open — cookie was already cleared above
  // Just sync the UI label to English; do not translate anything
  _syncUI('en');
  // Reset localStorage to English so the button shows "English" on open
  localStorage.setItem(LS_KEY, 'en');
}

// ─── Sync dropdown label + active state ───────────────────────
function _syncUI(code) {
  const entry = GT_LANGS.find(l => l.code === code) || GT_LANGS[0];
  const lbl   = document.getElementById('langBtnLabel');
  if (lbl) lbl.textContent = entry.label;
  document.querySelectorAll('.lang-item').forEach(li => {
    li.classList.toggle('lang-active', li.dataset.code === code);
  });
}

// ─── Hide GT's blue top bar ────────────────────────────────────
function _hideGTBar() {
  const bar = document.querySelector('.goog-te-banner-frame');
  if (bar) bar.style.display = 'none';
  if (document.body) document.body.style.top = '0px';
}

// ─── Build the custom language dropdown in the navbar ─────────
function createLanguageSelector(containerId) {
  const host = document.getElementById(containerId);
  if (!host) return;

  const wrap = document.createElement('div');
  wrap.className = 'gtw-wrap';

  const btn = document.createElement('button');
  btn.type      = 'button';
  btn.className = 'gtw-btn';
  btn.id        = 'langDropBtn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML =
    `<span id="langBtnLabel">English</span>` +
    `<svg class="gtw-caret" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true">` +
    `<path d="M0 0l5 6 5-6z" fill="currentColor"/></svg>`;

  const ul = document.createElement('ul');
  ul.className = 'gtw-list';
  ul.setAttribute('role', 'listbox');
  ul.hidden = true;

  GT_LANGS.forEach(lang => {
    const li = document.createElement('li');
    li.className    = 'lang-item';
    li.dataset.code = lang.code;
    li.textContent  = lang.label;
    li.setAttribute('role', 'option');
    if (lang.code === 'en') li.classList.add('lang-active');
    li.addEventListener('click', () => {
      selectLanguage(lang.code);
      ul.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('gtw-open');
    });
    ul.appendChild(li);
  });

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = !ul.hidden;
    ul.hidden = isOpen;
    btn.setAttribute('aria-expanded', String(!isOpen));
    btn.classList.toggle('gtw-open', !isOpen);
  });

  document.addEventListener('click', () => {
    ul.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.remove('gtw-open');
  });

  wrap.appendChild(btn);
  wrap.appendChild(ul);
  host.appendChild(wrap);
}

// ─── Inject styles ────────────────────────────────────────────
(function injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
    /* Kill GT's blue top bar completely */
    .goog-te-banner-frame,
    .goog-te-banner-frame.skiptranslate { display:none !important; }
    body { top:0 !important; }
    #goog-gt-tt,
    .goog-te-balloon-frame,
    .goog-tooltip,
    .goog-tooltip-content { display:none !important; }
    /* Prevent GT from showing the "translated by Google" footer */
    .goog-te-ftab-float { display:none !important; }

    /* ── Dropdown wrapper ── */
    .gtw-wrap { position:relative; display:inline-flex; align-items:center; }

    /* ── Toggle button ── */
    .gtw-btn {
      display:inline-flex; align-items:center; gap:7px;
      padding:5px 12px;
      background:rgba(255,255,255,.13);
      border:1px solid rgba(255,255,255,.28);
      border-radius:8px;
      color:#fff; font-size:.82rem; font-weight:600;
      cursor:pointer; white-space:nowrap;
      font-family:inherit;
      transition:background .18s, border-color .18s;
      line-height:1.5;
    }
    .gtw-btn:hover,
    .gtw-btn.gtw-open {
      background:rgba(255,255,255,.24);
      border-color:rgba(255,255,255,.55);
    }
    .gtw-caret {
      opacity:.75; flex-shrink:0;
      transition:transform .2s;
    }
    .gtw-btn.gtw-open .gtw-caret { transform:rotate(180deg); }

    /* ── Dropdown list ── */
    .gtw-list {
      position:absolute; top:calc(100% + 8px); right:0;
      background:#1b243d;
      border:1px solid rgba(255,255,255,.14);
      border-radius:10px; padding:5px 0;
      min-width:160px; max-height:340px;
      overflow-y:auto; list-style:none; margin:0;
      z-index:99999;
      box-shadow:0 10px 36px rgba(0,0,0,.45);
    }

    /* ── Items ── */
    .lang-item {
      padding:9px 16px;
      color:rgba(255,255,255,.82);
      font-size:.84rem; cursor:pointer;
      font-family:inherit;
      transition:background .14s, color .14s;
      user-select:none;
    }
    .lang-item:hover { background:rgba(255,255,255,.09); color:#fff; }
    .lang-active { color:var(--c-primary,#FF6A00) !important; font-weight:700; }
  `;
  document.head.appendChild(s);
})();

// ─── Public API ───────────────────────────────────────────────
window.i18n = { createLanguageSelector, selectLanguage, applySavedLanguage };

// ─── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  createLanguageSelector('languageSelector');
  applySavedLanguage();

  // Hide GT bar whenever GT injects it asynchronously
  new MutationObserver(_hideGTBar)
    .observe(document.body, { childList: true, subtree: false });
});