// ============================================================
// iVote — Application Logic
// ============================================================

const NEWS_API_KEY = 'b780a4753eeedd5e695c3e4c409be29d';

let currentCountry = 'IN';
let checklistState = {};
try { checklistState = JSON.parse(localStorage.getItem('ivote_cl') || '{}'); } catch (e) { checklistState = {}; }
let currentQuiz = [], quizIndex = 0, quizScore = 0, quizAnswered = false, isChatLoading = false;
let chatHistory = [];

// ── ONBOARDING ──────────────────────────────────────────────
function showOnboard() {
  document.getElementById('onboardOverlay').classList.remove('hidden');
}

function selectCountry(code) {
  currentCountry = code;
  try { localStorage.setItem('ivote_country', code); } catch (e) { }
  document.getElementById('onboardOverlay').classList.add('hidden');
  const sel = document.getElementById('countrySelect');
  if (sel) sel.value = code;
  applyTheme(code);
  updateHero(code);
  updateBanner(code);
  updateTimeline(code);
  updateInfo(code);
  buildChecklist(code);
  startQuiz(code);
  buildComparison();
  fetchNews();
  updateNavPills();
}

// ── THEME ENGINE ─────────────────────────────────────────────
function applyTheme(code) {
  document.documentElement.setAttribute('data-country', code);
  const theme = COUNTRY_THEMES[code] || COUNTRY_THEMES.DEFAULT;
  const root = document.documentElement;
  // Apply CSS variables from theme data
  Object.entries(theme).forEach(([k, v]) => {
    if (k.startsWith('--')) root.style.setProperty(k, v);
  });
}

// ── HERO ────────────────────────────────────────────────────
function updateHero(code) {
  const h = HERO_CONTENT[code] || HERO_CONTENT.DEFAULT;
  const cd = COUNTRY_DATA[code] || COUNTRY_DATA.DEFAULT;
  const theme = COUNTRY_THEMES[code] || COUNTRY_THEMES.DEFAULT;

  setText('heroEyebrow', h.eyebrow);
  setText('heroLine1', h.h1a);
  setText('heroLine2', h.h1b);
  setText('heroPara', h.para);
  setText('hsStat1', h.stat1n); setText('hsLbl1', h.stat1l);
  setText('hsStat2', h.stat2n); setText('hsLbl2', h.stat2l);
  setText('hsStat3', h.stat3n); setText('hsLbl3', h.stat3l);

  // Flag stripes
  const fs1 = document.getElementById('fs1');
  const fs2 = document.getElementById('fs2');
  const fs3 = document.getElementById('fs3');
  if (fs1) fs1.style.background = theme['--c-stripe1'] || '#1a4fa0';
  if (fs2) fs2.style.background = theme['--c-stripe2'] || '#4a7fc1';
  if (fs3) fs3.style.background = theme['--c-stripe3'] || '#0e3370';

  // Hero visual cards
  if (cd.timeline && cd.timeline.length >= 3) {
    for (let i = 0; i < 3; i++) {
      setText('hcPhase' + (i + 1), cd.timeline[i].phase);
      setText('hcTitle' + (i + 1), cd.timeline[i].title);
    }
  }
}

// ── BANNER ──────────────────────────────────────────────────
function updateBanner(code) {
  const cd = COUNTRY_DATA[code] || COUNTRY_DATA.DEFAULT;
  const h = HERO_CONTENT[code] || HERO_CONTENT.DEFAULT;
  setText('bannerFlag', cd.flag || '🌍');
  setText('bannerName', cd.name);
  setText('bannerBody', h.bodyName || cd.body);
}

function updateNavPills() {
  const cd = COUNTRY_DATA[currentCountry] || COUNTRY_DATA.DEFAULT;
  const pill = document.getElementById('newsPill');
  if (pill) pill.textContent = (cd.flag || '') + ' ' + cd.name;
}

// ── NAVBAR ──────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
  highlightNav();
});

function highlightNav() {
  const sections = ['home', 'news', 'timeline', 'info', 'quiz', 'compare', 'assistant'];
  const y = window.scrollY + 120;
  sections.forEach(id => {
    const el = document.getElementById(id);
    const lk = document.querySelector(`.nav-link[href="#${id}"]`);
    if (el && lk) {
      lk.classList.toggle('active', y >= el.offsetTop && y < el.offsetTop + el.offsetHeight);
    }
  });
}

function toggleMenu() {
  const links = document.getElementById('navLinks');
  const utils = document.getElementById('navUtils');
  const ham = document.getElementById('hamburger');
  if (links) links.classList.toggle('open');
  if (utils) utils.classList.toggle('open');
  if (ham) ham.classList.toggle('open');
}

// Close menu on link click
document.querySelectorAll('.nav-link').forEach(a => {
  a.addEventListener('click', () => {
    const links = document.getElementById('navLinks');
    const utils = document.getElementById('navUtils');
    const ham = document.getElementById('hamburger');
    if (links) links.classList.remove('open');
    if (utils) utils.classList.remove('open');
    if (ham) ham.classList.remove('open');
  });
});

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const id = a.getAttribute('href').slice(1);
    const t = document.getElementById(id);
    if (t) t.scrollIntoView({ behavior: 'smooth' });
  });
});

// Theme toggle
const themeBtn = document.getElementById('themeToggle');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeBtn.textContent = isDark ? '🌙' : '☀️';
    try { localStorage.setItem('ivote_theme', isDark ? 'light' : 'dark'); } catch (e) { }
  });
}

// ── NEWS ────────────────────────────────────────────────────
async function fetchNews() {
  const grid = document.getElementById('newsGrid');
  const cd = COUNTRY_DATA[currentCountry] || COUNTRY_DATA.DEFAULT;
  if (!grid) return;

  grid.innerHTML = '<div class="loading-row"><div class="spinner"></div><span>Loading news for ' + esc(cd.name) + '…</span></div>';

  const q = encodeURIComponent('election OR voting OR democracy ' + cd.name);
  try {
    const res = await fetch(`https://gnews.io/api/v4/search?q=${q}&lang=en&max=6&apikey=${NEWS_API_KEY}`);
    const data = await res.json();
    if (data.articles && data.articles.length) {
      grid.innerHTML = '';
      data.articles.forEach(a => {
        const d = new Date(a.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const colorHex = (COUNTRY_THEMES[currentCountry]?.['--c-primary'] || '#1a4fa0').replace('#', '');
        const img = a.image || `https://placehold.co/600x300/${colorHex}/ffffff?text=${encodeURIComponent(cd.name + ' News')}`;
        const card = document.createElement('div');
        card.className = 'news-card';
        card.innerHTML = `
          <img class="news-img" src="${esc(img)}" alt="${esc(a.title)}" loading="lazy"
               onerror="this.src='https://placehold.co/600x300/1a4fa0/ffffff?text=iVote+News'">
          <div class="news-body">
            <div class="news-meta">${esc(d)} · ${esc(a.source?.name || '')}</div>
            <div class="news-headline"><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.title)}</a></div>
            <div class="news-snippet">${esc(a.description || '')}</div>
            <a class="news-read" href="${esc(a.url)}" target="_blank" rel="noopener">Read full story →</a>
          </div>`;
        grid.appendChild(card);
      });
    } else {
      showNewsEmpty(grid, cd.name);
    }
  } catch (err) {
    showNewsEmpty(grid, cd.name);
  }
}

function showNewsEmpty(grid, name) {
  grid.innerHTML = `<div class="news-empty"><div class="news-empty-icon">📰</div><p>No recent news found for ${esc(name)}. <button class="btn-outline-sm" onclick="fetchNews()" style="margin-top:.5rem">Try again</button></p></div>`;
}

// ── TIMELINE ─────────────────────────────────────────────────
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.15 });

function updateTimeline(code) {
  const cd = COUNTRY_DATA[code] || COUNTRY_DATA.DEFAULT;
  const wrap = document.getElementById('timelineItems');
  if (!wrap) return;
  wrap.innerHTML = '';

  cd.timeline.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = `tl-item ${item.side}`;
    div.style.transitionDelay = `${i * 0.08}s`;

    const cardHtml = `
      <div class="tl-card" onclick="askAbout('Tell me more about the ${esc(item.title)} phase in ${esc(cd.name)} elections')">
        <div class="tl-phase">${esc(item.phase)}</div>
        <div class="tl-title">${esc(item.title)}</div>
        <div class="tl-desc">${esc(item.desc)}</div>
        <span class="tl-date">${esc(item.date)}</span>
        <div class="tl-ask-hint">✦ Ask iVote AI about this →</div>
      </div>`;
    const dotHtml = `<div class="tl-dot">${item.icon}</div>`;
    const gapHtml = `<div class="tl-gap"></div>`;

    if (item.side === 'left') {
      div.innerHTML = cardHtml + dotHtml + gapHtml;
    } else {
      div.innerHTML = gapHtml + dotHtml + cardHtml;
    }
    wrap.appendChild(div);
    observer.observe(div);
  });
}

// ── INFO SECTION ─────────────────────────────────────────────
function updateInfo(code) {
  const cd = COUNTRY_DATA[code] || COUNTRY_DATA.DEFAULT;
  setText('infoReq', cd.requirements);
  setText('infoReg', cd.registration);
  const ul = document.getElementById('infoMethods');
  if (ul) {
    ul.innerHTML = '';
    (cd.methods || []).forEach(m => {
      const li = document.createElement('li');
      li.textContent = m;
      ul.appendChild(li);
    });
  }
}

// ── CHECKLIST ─────────────────────────────────────────────────
function buildChecklist(code) {
  const cd = COUNTRY_DATA[code] || COUNTRY_DATA.DEFAULT;
  const list = document.getElementById('checklistItems');
  if (!list) return;
  list.innerHTML = '';

  // Reset checklist state for new country
  checklistState = {};

  cd.checklist.forEach((item, i) => {
    checklistState[i] = false;
    const div = document.createElement('div');
    div.className = 'cl-item';
    div.id = `cl-${i}`;
    div.innerHTML = `<div class="cl-check">✓</div><span class="cl-label">${esc(item)}</span>`;
    div.onclick = () => toggleCheck(i, cd.checklist.length);
    list.appendChild(div);
  });
  updateProgress(cd.checklist.length);
}

function toggleCheck(i, total) {
  checklistState[i] = !checklistState[i];
  try { localStorage.setItem('ivote_cl', JSON.stringify(checklistState)); } catch (e) { }
  const el = document.getElementById(`cl-${i}`);
  if (el) el.classList.toggle('checked', checklistState[i]);
  updateProgress(total);
}

function updateProgress(total) {
  const done = Object.values(checklistState).filter(Boolean).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const pb = document.getElementById('progressBar');
  const badge = document.getElementById('pctBadge');
  if (pb) pb.style.width = pct + '%';
  if (badge) badge.textContent = pct + '%';
}

// ── QUIZ ───────────────────────────────────────────────────────
function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startQuiz(code) {
  const cd = COUNTRY_DATA[code] || COUNTRY_DATA.DEFAULT;
  const pool = [...(cd.quiz || []), ...(QUIZ_POOL || [])];
  currentQuiz = shuffleArr(pool).slice(0, 5);
  quizIndex = 0;
  quizScore = 0;

  const qCard = document.getElementById('quizCard');
  const qRes = document.getElementById('quizResult');
  if (qCard) qCard.style.display = 'block';
  if (qRes) qRes.style.display = 'none';
  loadQuestion();
}

function loadQuestion() {
  quizAnswered = false;
  const q = currentQuiz[quizIndex];
  if (!q) return;

  const pct = (quizIndex / currentQuiz.length) * 100;
  const pfill = document.getElementById('quizProgFill');
  if (pfill) pfill.style.width = pct + '%';
  setText('quizProgText', `Question ${quizIndex + 1} of ${currentQuiz.length}`);
  setText('quizScoreBadge', `★ ${quizScore} pts`);
  setText('quizQuestion', q.q);

  const fb = document.getElementById('quizFeedback');
  if (fb) { fb.style.display = 'none'; fb.className = 'quiz-feedback'; }
  const nb = document.getElementById('quizNextBtn');
  if (nb) nb.style.display = 'none';

  const opts = document.getElementById('quizOptions');
  if (!opts) return;
  opts.innerHTML = '';
  ['A', 'B', 'C', 'D'].forEach((letter, i) => {
    if (!q.opts[i]) return;
    const btn = document.createElement('button');
    btn.className = 'quiz-opt';
    btn.innerHTML = `<span class="opt-letter">${letter}</span>${esc(q.opts[i])}`;
    btn.onclick = () => answerQuestion(i);
    opts.appendChild(btn);
  });
}

function answerQuestion(idx) {
  if (quizAnswered) return;
  quizAnswered = true;
  const q = currentQuiz[quizIndex];
  const correct = idx === q.correct;
  if (correct) quizScore++;

  document.querySelectorAll('.quiz-opt').forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correct) btn.classList.add('correct');
    else if (i === idx && !correct) btn.classList.add('wrong');
  });

  const fb = document.getElementById('quizFeedback');
  if (fb) {
    fb.innerHTML = `<strong>${correct ? '✅ Correct!' : '❌ Incorrect.'}</strong> ${esc(q.explanation)}`;
    fb.className = 'quiz-feedback ' + (correct ? 'correct' : 'wrong');
    fb.style.display = 'block';
  }
  setText('quizScoreBadge', `★ ${quizScore} pts`);

  const nb = document.getElementById('quizNextBtn');
  if (nb) {
    nb.textContent = quizIndex === currentQuiz.length - 1 ? 'See Results 🏆' : 'Next Question →';
    nb.style.display = 'flex';
  }
}

function nextQuestion() {
  quizIndex++;
  if (quizIndex >= currentQuiz.length) showQuizResult();
  else loadQuestion();
}

function showQuizResult() {
  const qCard = document.getElementById('quizCard');
  const qRes = document.getElementById('quizResult');
  if (qCard) qCard.style.display = 'none';
  if (qRes) qRes.style.display = 'block';

  const pct = Math.round((quizScore / currentQuiz.length) * 100);
  let emoji, title, desc;
  if (pct >= 80) { emoji = '🏆'; title = 'Election Expert!'; desc = 'Outstanding! You have a deep, accurate understanding of the democratic process.'; }
  else if (pct >= 60) { emoji = '⭐'; title = 'Civic Champion!'; desc = 'Well done! Keep exploring iVote to sharpen your knowledge further.'; }
  else if (pct >= 40) { emoji = '📚'; title = 'Learning Citizen!'; desc = 'Good effort. Browse the Timeline and Info sections to build your knowledge.'; }
  else { emoji = '🌱'; title = 'Democracy Beginner!'; desc = 'Every expert started here. Explore iVote and try again!'; }
  setText('resultEmoji', emoji);
  setText('resultTitle', title);
  setText('resultDesc', desc);
  setText('resultScore', `${quizScore} / ${currentQuiz.length}`);
}

function restartQuiz() { startQuiz(currentCountry); }

// ── COMPARE ────────────────────────────────────────────────────
function buildComparison() {
  const aKey = document.getElementById('compareA')?.value || 'IN';
  const bKey = document.getElementById('compareB')?.value || 'US';
  const a = COUNTRY_DATA[aKey] || COUNTRY_DATA.DEFAULT;
  const b = COUNTRY_DATA[bKey] || COUNTRY_DATA.DEFAULT;
  const ha = HERO_CONTENT[aKey] || HERO_CONTENT.DEFAULT;
  const hb = HERO_CONTENT[bKey] || HERO_CONTENT.DEFAULT;

  const rows = [
    { label: 'Country', aVal: (a.flag || '') + '  ' + a.name, bVal: (b.flag || '') + '  ' + b.name },
    { label: 'Political System', aVal: a.system, bVal: b.system },
    { label: 'Election Frequency', aVal: a.frequency, bVal: b.frequency },
    { label: 'Electoral Body', aVal: ha.bodyName || a.body, bVal: hb.bodyName || b.body },
    { label: 'ID Requirements', aVal: a.requirements, bVal: b.requirements },
    { label: 'Voting Methods', aVal: (a.methods || []).join(' · '), bVal: (b.methods || []).join(' · ') },
    { label: 'Registration', aVal: a.registration, bVal: b.registration },
  ];

  const grid = document.getElementById('compareGrid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="compare-header-row">
      <div class="compare-col-head">Category</div>
      <div class="compare-col-head">${esc(a.flag || '')} ${esc(a.name)}</div>
      <div class="compare-col-head">${esc(b.flag || '')} ${esc(b.name)}</div>
    </div>
    ${rows.map(r => `
      <div class="compare-row">
        <div class="compare-cell label">${esc(r.label)}</div>
        <div class="compare-cell">${esc(r.aVal)}</div>
        <div class="compare-cell">${esc(r.bVal)}</div>
      </div>`).join('')}`;
}

// ── QUICK TOPICS ───────────────────────────────────────────────
function buildQuickTopics() {
  const wrap = document.getElementById('quickTopics');
  if (!wrap) return;
  wrap.innerHTML = '';
  QUICK_TOPICS.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'q-pill';
    btn.textContent = t;
    btn.onclick = () => {
      const inp = document.getElementById('chatInput');
      if (inp) { inp.value = t; sendMessage(); }
    };
    wrap.appendChild(btn);
  });
}

// ── AI CHAT (Claude via Anthropic API) ──────────────────────────
function clearChat() {
  chatHistory = [];
  const msgs = document.getElementById('chatMessages');
  if (msgs) msgs.innerHTML = `
    <div class="msg msg-bot">
      <div class="msg-av">✦</div>
      <div class="msg-bubble">Chat cleared! I'm <strong>iVote AI</strong> — ask me anything about elections or voting. 🗳</div>
    </div>`;
}

function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function addMsg(type, html) {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = `msg msg-${type}`;
  const isBot = type === 'bot';
  div.innerHTML = `
    <div class="msg-av">${isBot ? '✦' : '👤'}</div>
    <div class="msg-bubble">${isBot ? html : esc(html)}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function fmtBot(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^[-•] (.+)$/gm, '<span style="display:block;padding-left:1em;margin-bottom:.25em">· $1</span>')
    .replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>')
    .replace(/^/, '<p>').replace(/$/, '</p>');
}

function demoReply(input) {
  const l = input.toLowerCase();
  if (l.includes('register')) return DEMO_RESPONSES.register;
  if (l.includes('id') || l.includes('document')) return DEMO_RESPONSES.id;
  if (l.includes('right')) return DEMO_RESPONSES.rights;
  return DEMO_RESPONSES.default;
}

async function sendMessage() {
  const inp = document.getElementById('chatInput');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text || isChatLoading) return;

  addMsg('user', text);
  inp.value = '';
  inp.style.height = 'auto';
  isChatLoading = true;

  const sendBtn = document.getElementById('sendBtn');
  const typing = document.getElementById('typingIndicator');
  if (sendBtn) sendBtn.disabled = true;
  if (typing) typing.style.display = 'flex';
  const msgs = document.getElementById('chatMessages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;

  const ctx = (COUNTRY_DATA[currentCountry] || COUNTRY_DATA.DEFAULT).name;

  // Add to history
  chatHistory.push({ role: 'user', content: text });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: `You are iVote AI, a knowledgeable, friendly, strictly non-partisan global election guide. Currently helping users about elections in: ${ctx}. Be concise (under 300 words), accurate, and use markdown bold and bullet points where helpful. Never express political opinions or favor any party or candidate.`,
        messages: chatHistory
      })
    });

    const data = await response.json();
    if (typing) typing.style.display = 'none';

    let reply = '';
    if (data.content && data.content[0] && data.content[0].text) {
      reply = data.content[0].text;
      chatHistory.push({ role: 'assistant', content: reply });
    } else {
      reply = demoReply(text);
    }
    addMsg('bot', fmtBot(reply));

  } catch (err) {
    if (typing) typing.style.display = 'none';
    const fallback = demoReply(text);
    chatHistory.push({ role: 'assistant', content: fallback });
    addMsg('bot', fmtBot(fallback));
  }

  isChatLoading = false;
  if (sendBtn) sendBtn.disabled = false;
}

function askAbout(topic) {
  const section = document.getElementById('assistant');
  if (section) section.scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => {
    const inp = document.getElementById('chatInput');
    if (inp) { inp.value = topic; sendMessage(); }
  }, 700);
}

// Auto-resize textarea
const chatInput = document.getElementById('chatInput');
if (chatInput) {
  chatInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 130) + 'px';
  });
}

// ── UTILITIES ──────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val || '';
}
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── INIT ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Restore theme preference
  let savedTheme = 'light';
  try { savedTheme = localStorage.getItem('ivote_theme') || 'light'; } catch (e) { }
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

  // Start with India by default (or saved preference)
  let savedCountry = 'IN';
  try { savedCountry = localStorage.getItem('ivote_country') || 'IN'; } catch (e) { }

  // Always show onboarding on first load for dramatic effect, unless returning user
  let hasVisited = false;
  try { hasVisited = !!localStorage.getItem('ivote_country'); } catch (e) { }

  // Load the country data first (always starts with saved/default)
  selectCountry(savedCountry);

  // Show onboarding overlay only for new visitors
  if (!hasVisited) {
    const overlay = document.getElementById('onboardOverlay');
    if (overlay) overlay.classList.remove('hidden');
  }

  buildQuickTopics();
  highlightNav();
});