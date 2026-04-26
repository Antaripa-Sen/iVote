// ============================================================
// iVote — i18n.js  (MOBILE-FIXED)
//
// KEY FIXES:
//   1. Aggressive Google Translate bar removal on mobile
//   2. Mobile-friendly language dropdown (full-screen modal on small screens)
//   3. Proper body scroll lock when dropdown is open on mobile
//   4. iOS Safari fix — prevents viewport jumping from GT bar
// ============================================================

const GT_LANGS = [
  { code: 'en',    label: 'English'    },
  { code: 'hi',    label: 'हिन्दी'      },
  { code: 'bn',    label: 'বাংলা'       },
  { code: 'es',    label: 'Español'    },
  { code: 'fr',    label: 'Français'   },
  { code: 'de',    label: 'Deutsch'    },
  { code: 'zh-CN', label: '中文'        },
  { code: 'ar',    label: 'العربية'    },
  { code: 'ru',    label: 'Русский'    },
  { code: 'pt',    label: 'Português'  },
  { code: 'ja',    label: '日本語'      },
];

const LS_KEY = 'ivote_language';

// ─── Nuke googtrans cookie immediately ───────────────────────
(function clearGTCookieImmediately() {
  const exp = 'expires=Thu, 01 Jan 1970 00:00:00 UTC';
  document.cookie = `googtrans=; ${exp}; path=/`;
  document.cookie = `googtrans=; ${exp}; domain=${location.hostname}; path=/`;
  document.cookie = `googtrans=; ${exp}; domain=.${location.hostname}; path=/`;
})();

// ─── Inject GT-killing styles immediately ────────────────────
// These fire before DOM is ready to prevent any flash of the GT bar
(function injectGTKillerStyles() {
  const s = document.createElement('style');
  s.id = 'gt-killer-styles';
  s.textContent = `
    /* ── NUCLEAR GT bar removal ── */
    .goog-te-banner-frame,
    .goog-te-banner-frame.skiptranslate,
    #goog-gt-tt,
    .goog-te-balloon-frame,
    .goog-tooltip,
    .goog-te-ftab-float,
    .VIpgJd-ZVi9od-aZ2wEe-wOHMyf,
    .VIpgJd-ZVi9od-aZ2wEe-OiiCO,
    .VIpgJd-ZVi9od-l4eHX-hSRGPd,
    .skiptranslate,
    font[face="Arial"] > *[id^="goog"] {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      max-height: 0 !important;
      overflow: hidden !important;
      pointer-events: none !important;
    }

    /* Keep body at top — GT shifts it down by 40px */
    body {
      top: 0 !important;
      position: static !important;
    }

    /* ── Language Dropdown Styles ── */
    .gtw-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .gtw-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 5px 12px;
      background: rgba(255,255,255,.13);
      border: 1px solid rgba(255,255,255,.28);
      border-radius: 8px;
      color: #fff;
      font-size: .82rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      font-family: inherit;
      transition: background .18s, border-color .18s;
      line-height: 1.5;
      min-height: 36px;
      -webkit-tap-highlight-color: transparent;
    }
    .gtw-btn:hover,
    .gtw-btn.gtw-open {
      background: rgba(255,255,255,.24);
      border-color: rgba(255,255,255,.55);
    }
    .gtw-caret {
      opacity: .75;
      flex-shrink: 0;
      transition: transform .2s;
    }
    .gtw-btn.gtw-open .gtw-caret { transform: rotate(180deg); }

    /* ── Desktop dropdown ── */
    .gtw-list {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: #1b243d;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 10px;
      padding: 5px 0;
      min-width: 160px;
      max-height: 340px;
      overflow-y: auto;
      list-style: none;
      margin: 0;
      z-index: 99999;
      box-shadow: 0 10px 36px rgba(0,0,0,.45);
    }

    .lang-item {
      padding: 9px 16px;
      color: rgba(255,255,255,.82);
      font-size: .84rem;
      cursor: pointer;
      font-family: inherit;
      transition: background .14s, color .14s;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      min-height: 44px;
      display: flex;
      align-items: center;
    }
    .lang-item:hover,
    .lang-item:active { background: rgba(255,255,255,.09); color: #fff; }
    .lang-active { color: var(--c-primary, #FF6A00) !important; font-weight: 700; }

    /* ── Mobile: full-screen bottom sheet ── */
    .gtw-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.55);
      z-index: 100000;
      -webkit-backdrop-filter: blur(2px);
      backdrop-filter: blur(2px);
      align-items: flex-end;
      justify-content: center;
    }
    .gtw-overlay.open {
      display: flex;
    }

    .gtw-sheet {
      background: #1b243d;
      border-radius: 20px 20px 0 0;
      width: 100%;
      max-width: 540px;
      padding: 0 0 env(safe-area-inset-bottom, 16px);
      box-shadow: 0 -8px 40px rgba(0,0,0,.5);
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      animation: slideUp .25s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }

    .gtw-sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px 12px;
      border-bottom: 1px solid rgba(255,255,255,.1);
      flex-shrink: 0;
    }
    .gtw-sheet-title {
      color: #fff;
      font-size: 1rem;
      font-weight: 700;
      font-family: inherit;
    }
    .gtw-sheet-close {
      background: rgba(255,255,255,.12);
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #fff;
      font-size: 1.1rem;
      font-family: inherit;
      -webkit-tap-highlight-color: transparent;
    }
    .gtw-sheet-close:active { background: rgba(255,255,255,.2); }

    .gtw-sheet-list {
      list-style: none;
      margin: 0;
      padding: 8px 0;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      flex: 1;
    }
    .gtw-sheet-list .lang-item {
      padding: 14px 20px;
      font-size: .95rem;
      min-height: 52px;
      border-bottom: 1px solid rgba(255,255,255,.05);
    }
    .gtw-sheet-list .lang-item:last-child { border-bottom: none; }

    /* ── Hide desktop list on mobile, show overlay ── */
    @media (max-width: 600px) {
      .gtw-list { display: none !important; }
    }
    @media (min-width: 601px) {
      .gtw-overlay { display: none !important; }
    }
  `;
  document.head.appendChild(s);
})();

// ─── Core GT translation functions ───────────────────────────
function _doTranslate(targetCode) {
  const pair = `en|${targetCode}`;
  if (typeof doGTranslate === 'function') {
    doGTranslate(pair);
    return true;
  }
  const combo = document.querySelector('.goog-te-combo');
  if (combo) {
    combo.value = targetCode;
    combo.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  return false;
}

function _doRestoreEnglish() {
  if (typeof doGTranslate === 'function') doGTranslate('en|en');
  const combo = document.querySelector('.goog-te-combo');
  if (combo) {
    combo.value = 'en';
    combo.dispatchEvent(new Event('change', { bubbles: true }));
  }
  try {
    const bar = document.querySelector('.goog-te-banner-frame');
    if (bar) {
      const restore = bar.contentDocument.querySelector('a.restore');
      if (restore) restore.click();
    }
  } catch (e) {}
}

// ─── GT bar removal — runs repeatedly ────────────────────────
function _nukeGTBar() {
  // Remove the banner frame
  document.querySelectorAll(
    '.goog-te-banner-frame, .VIpgJd-ZVi9od-aZ2wEe-wOHMyf, .VIpgJd-ZVi9od-aZ2wEe-OiiCO'
  ).forEach(el => {
    el.style.cssText = 'display:none!important;height:0!important;visibility:hidden!important;';
  });
  // Reset body top — GT sets it to 40px on mobile
  if (document.body) {
    document.body.style.top = '0px';
    document.body.style.position = '';
  }
  // Kill the skiptranslate elements (GT's container)
  document.querySelectorAll('.skiptranslate:not(#google_translate_element)').forEach(el => {
    if (el.tagName === 'IFRAME' || el.classList.contains('goog-te-banner-frame')) {
      el.style.cssText = 'display:none!important;height:0!important;';
    }
  });
}

// ─── Pending translate retry ──────────────────────────────────
let _pendingLang = null;
let _retryHandle = null;

function selectLanguage(code) {
  localStorage.setItem(LS_KEY, code);
  _syncUI(code);
  _closeDropdowns();

  if (code === 'en') {
    _pendingLang = null;
    if (_retryHandle) { clearInterval(_retryHandle); _retryHandle = null; }
    _doRestoreEnglish();
    // Re-nuke the bar after restoring since GT might re-show it
    setTimeout(_nukeGTBar, 300);
    setTimeout(_nukeGTBar, 800);
    return;
  }

  if (_doTranslate(code)) {
    _pendingLang = null;
    setTimeout(_nukeGTBar, 300);
    setTimeout(_nukeGTBar, 800);
    return;
  }

  _pendingLang = code;
  if (_retryHandle) clearInterval(_retryHandle);
  let attempts = 0;
  _retryHandle = setInterval(() => {
    attempts++;
    if (_doTranslate(_pendingLang)) {
      clearInterval(_retryHandle);
      _retryHandle = null;
      _pendingLang = null;
      setTimeout(_nukeGTBar, 300);
      setTimeout(_nukeGTBar, 800);
    }
    if (attempts > 66) {
      clearInterval(_retryHandle);
      _retryHandle = null;
    }
  }, 300);
}

function applySavedLanguage() {
  _syncUI('en');
  localStorage.setItem(LS_KEY, 'en');
}

function _syncUI(code) {
  const entry = GT_LANGS.find(l => l.code === code) || GT_LANGS[0];
  // Update main button label
  document.querySelectorAll('.gtw-btn-label').forEach(el => el.textContent = entry.label);
  // Update active state in all lists
  document.querySelectorAll('.lang-item').forEach(li => {
    li.classList.toggle('lang-active', li.dataset.code === code);
  });
}

function _closeDropdowns() {
  // Close desktop dropdown
  document.querySelectorAll('.gtw-list').forEach(ul => { ul.hidden = true; });
  document.querySelectorAll('.gtw-btn').forEach(btn => {
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.remove('gtw-open');
  });
  // Close mobile sheet
  const overlay = document.getElementById('gtw-mobile-overlay');
  if (overlay) overlay.classList.remove('open');
  // Restore scroll
  document.body.style.overflow = '';
}

// ─── Build language selector ──────────────────────────────────
function createLanguageSelector(containerId) {
  const host = document.getElementById(containerId);
  if (!host) return;

  const isMobile = () => window.innerWidth <= 600;

  // ── Wrapper ──
  const wrap = document.createElement('div');
  wrap.className = 'gtw-wrap';

  // ── Toggle Button ──
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'gtw-btn';
  btn.id = 'langDropBtn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML =
    `<span class="gtw-btn-label">English</span>` +
    `<svg class="gtw-caret" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true">` +
    `<path d="M0 0l5 6 5-6z" fill="currentColor"/></svg>`;

  // ── Desktop dropdown list ──
  const ul = document.createElement('ul');
  ul.className = 'gtw-list';
  ul.setAttribute('role', 'listbox');
  ul.hidden = true;

  // ── Mobile overlay + sheet ──
  const overlay = document.createElement('div');
  overlay.className = 'gtw-overlay';
  overlay.id = 'gtw-mobile-overlay';
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('role', 'dialog');

  const sheet = document.createElement('div');
  sheet.className = 'gtw-sheet';

  const sheetHeader = document.createElement('div');
  sheetHeader.className = 'gtw-sheet-header';
  sheetHeader.innerHTML =
    `<span class="gtw-sheet-title">🌐 Select Language</span>`;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'gtw-sheet-close';
  closeBtn.setAttribute('aria-label', 'Close language selector');
  closeBtn.innerHTML = '✕';
  closeBtn.addEventListener('click', () => {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  });
  sheetHeader.appendChild(closeBtn);

  const sheetList = document.createElement('ul');
  sheetList.className = 'gtw-sheet-list';
  sheetList.setAttribute('role', 'listbox');

  // ── Populate both lists ──
  GT_LANGS.forEach(lang => {
    // Desktop item
    const li = document.createElement('li');
    li.className = 'lang-item';
    li.dataset.code = lang.code;
    li.textContent = lang.label;
    li.setAttribute('role', 'option');
    if (lang.code === 'en') li.classList.add('lang-active');
    li.addEventListener('click', () => {
      selectLanguage(lang.code);
      ul.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('gtw-open');
    });
    ul.appendChild(li);

    // Mobile item (clone)
    const liM = document.createElement('li');
    liM.className = 'lang-item';
    liM.dataset.code = lang.code;
    liM.textContent = lang.label;
    liM.setAttribute('role', 'option');
    if (lang.code === 'en') liM.classList.add('lang-active');
    liM.addEventListener('click', () => {
      selectLanguage(lang.code);
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    });
    sheetList.appendChild(liM);
  });

  sheet.appendChild(sheetHeader);
  sheet.appendChild(sheetList);
  overlay.appendChild(sheet);
  // Tap outside sheet closes it
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
  document.body.appendChild(overlay);

  // ── Button click handler ──
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isMobile()) {
      // Open bottom sheet
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden'; // prevent bg scroll
    } else {
      // Toggle desktop dropdown
      const isOpen = !ul.hidden;
      ul.hidden = isOpen;
      btn.setAttribute('aria-expanded', String(!isOpen));
      btn.classList.toggle('gtw-open', !isOpen);
    }
  });

  // Close desktop dropdown on outside click
  document.addEventListener('click', () => {
    if (!ul.hidden) {
      ul.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('gtw-open');
    }
  });

  wrap.appendChild(btn);
  wrap.appendChild(ul);
  host.appendChild(wrap);
}

// ─── MutationObserver to continuously kill GT bar ────────────
function _watchAndKillGTBar() {
  // Kill immediately
  _nukeGTBar();

  // Watch for GT injecting its bar later
  const observer = new MutationObserver((mutations) => {
    let shouldNuke = false;
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          const cls = node.className || '';
          if (typeof cls === 'string' && (
            cls.includes('goog-te') ||
            cls.includes('VIpgJd') ||
            cls.includes('skiptranslate')
          )) {
            shouldNuke = true;
          }
        }
      });
    });
    if (shouldNuke) _nukeGTBar();
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Also poll every 500ms for the first 10s (catches iOS Safari's delayed injection)
  let polls = 0;
  const pollTimer = setInterval(() => {
    _nukeGTBar();
    polls++;
    if (polls > 20) clearInterval(pollTimer);
  }, 500);
}

// ─── iOS Safari: prevent GT from pushing body down ───────────
function _fixiOSViewport() {
  // GT sets document.body.style.top = '40px' on iOS
  // We need to override this continuously for the first few seconds
  let attempts = 0;
  const fix = setInterval(() => {
    if (document.body && document.body.style.top && document.body.style.top !== '0px') {
      document.body.style.top = '0px';
    }
    attempts++;
    if (attempts > 30) clearInterval(fix);
  }, 200);
}

// ─── Public API ───────────────────────────────────────────────
window.i18n = { createLanguageSelector, selectLanguage, applySavedLanguage };

// ─── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  createLanguageSelector('languageSelector');
  applySavedLanguage();
  _watchAndKillGTBar();
  _fixiOSViewport();
});

// Start killing the bar immediately even before DOMContentLoaded
if (document.readyState !== 'loading') {
  _watchAndKillGTBar();
  _fixiOSViewport();
}