// ============================================================
// iVote — Application Logic
// ============================================================

// API Keys are loaded from config.js (loaded from .env.local, localStorage, or environment)
const NEWS_API_KEY = window.CONFIG?.NEWS_API_KEY || '';
const GROQ_API_KEY = window.CONFIG?.GROQ_API_KEY || '';

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

// ── AI CHAT (Groq API) ───────────────────────────────────────
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
  if (l.includes('date') || l.includes('when') || l.includes('day') || l.includes('election day') || l.includes('vote date')) return DEMO_RESPONSES.dates;
  if (l.includes('count') || l.includes('result') || l.includes('certif') || l.includes('counting')) return DEMO_RESPONSES.counting;
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

  const groqKey = GROQ_API_KEY;
  if (!groqKey || groqKey === 'YOUR_GROQ_API_KEY') {
    if (typing) typing.style.display = 'none';
    addMsg('bot', fmtBot('⚠️ Groq API key is missing. Add your key to `js/app.js` in `GROQ_API_KEY` or set `localStorage.ivote_groq_key`.'));
    isChatLoading = false;
    if (sendBtn) sendBtn.disabled = false;
    return;
  }

  try {
    const systemPrompt = `You are iVote AI, a knowledgeable, friendly, strictly non-partisan global election guide. Currently helping users about elections in: ${ctx}. Be concise (under 300 words), accurate, and use markdown bold and bullet points where helpful. Never express political opinions or favor any party or candidate.`;
    const response = await fetch('https://api.groq.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'groq-1.5',
        messages: [
          { role: 'system', content: systemPrompt },
          ...chatHistory
        ],
        max_tokens: 512,
        temperature: 0.2
      })
    });

    const data = await response.json();
    if (typing) typing.style.display = 'none';

    const parseGroqReply = (payload) => {
      if (!payload) return '';
      const parts = [];

      const walk = (node) => {
        if (node === null || node === undefined) return;
        if (typeof node === 'string') {
          const trimmed = node.trim();
          if (trimmed) parts.push(trimmed);
          return;
        }
        if (typeof node === 'number' || typeof node === 'boolean') {
          parts.push(String(node));
          return;
        }
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        if (typeof node === 'object') {
          if (node.text) { walk(node.text); return; }
          if (node.output_text) { walk(node.output_text); return; }
          if (node.content) { walk(node.content); return; }
          if (node.message) { walk(node.message.content || node.message); return; }
          if (node.choices) { walk(node.choices); return; }
          if (node.outputs) { walk(node.outputs); return; }
          if (node.data) { walk(node.data); return; }
          Object.values(node).forEach(walk);
        }
      };

      walk(payload);
      return parts.join(' ').trim();
    };

    let reply = parseGroqReply(data);
    if (!reply) {
      if (!response.ok) {
        const errText = data?.error?.message || data?.message || JSON.stringify(data);
        reply = `⚠️ Groq error: ${errText}`;
      } else {
        reply = '⚠️ I could not parse the Groq response. Please try again with another vote-related question.';
        console.error('Groq response missing text', data);
      }
    }

    chatHistory.push({ role: 'assistant', content: reply });
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

// ============================================================
// COUNTRY THEMES — CSS Variables for Each Nation
// ============================================================
const COUNTRY_THEMES = {
  DEFAULT: {
    '--c-primary': '#1a4fa0',
    '--c-secondary': '#0e3370',
    '--c-accent': '#1a4fa0',
    '--c-hero-bg': '#0a1f4e',
    '--c-stripe1': '#1a4fa0',
    '--c-stripe2': '#4a7fc1',
    '--c-stripe3': '#0e3370',
    '--c-tag-bg': '#e8eef8',
    '--c-tag-text': '#1a4fa0'
  },
  IN: {
    '--c-primary': '#FF6A00',
    '--c-secondary': '#046A38',
    '--c-accent': '#003580',
    '--c-hero-bg': '#0d1d35',
    '--c-stripe1': '#FF6A00',
    '--c-stripe2': '#ffffff',
    '--c-stripe3': '#046A38',
    '--c-tag-bg': '#fff4e6',
    '--c-tag-text': '#bf4900'
  },
  US: {
    '--c-primary': '#B22234',
    '--c-secondary': '#003580',
    '--c-accent': '#FFFFFF',
    '--c-hero-bg': '#0a1f4e',
    '--c-stripe1': '#B22234',
    '--c-stripe2': '#FFFFFF',
    '--c-stripe3': '#003580',
    '--c-tag-bg': '#ffe6e6',
    '--c-tag-text': '#8b0000'
  },
  UK: {
    '--c-primary': '#012169',
    '--c-secondary': '#C8102E',
    '--c-accent': '#012169',
    '--c-hero-bg': '#0a1f4e',
    '--c-stripe1': '#012169',
    '--c-stripe2': '#C8102E',
    '--c-stripe3': '#012169',
    '--c-tag-bg': '#e6f0ff',
    '--c-tag-text': '#012169'
  },
  AU: {
    '--c-primary': '#012169',
    '--c-secondary': '#C8102E',
    '--c-accent': '#FFCD00',
    '--c-hero-bg': '#0a1f4e',
    '--c-stripe1': '#012169',
    '--c-stripe2': '#FFCD00',
    '--c-stripe3': '#C8102E',
    '--c-tag-bg': '#fff9e6',
    '--c-tag-text': '#b8860b'
  },
  CA: {
    '--c-primary': '#C8102E',
    '--c-secondary': '#FFFFFF',
    '--c-accent': '#C8102E',
    '--c-hero-bg': '#0a1f4e',
    '--c-stripe1': '#C8102E',
    '--c-stripe2': '#FFFFFF',
    '--c-stripe3': '#C8102E',
    '--c-tag-bg': '#ffe6e6',
    '--c-tag-text': '#8b0000'
  },
  FR: {
    '--c-primary': '#002654',
    '--c-secondary': '#C8102E',
    '--c-accent': '#FFFFFF',
    '--c-hero-bg': '#0a1f4e',
    '--c-stripe1': '#002654',
    '--c-stripe2': '#FFFFFF',
    '--c-stripe3': '#C8102E',
    '--c-tag-bg': '#e6f0ff',
    '--c-tag-text': '#002654'
  },
  DE: {
    '--c-primary': '#DD0000',
    '--c-secondary': '#000000',
    '--c-accent': '#FFCC00',
    '--c-hero-bg': '#0a1f4e',
    '--c-stripe1': '#000000',
    '--c-stripe2': '#DD0000',
    '--c-stripe3': '#FFCC00',
    '--c-tag-bg': '#ffe6e6',
    '--c-tag-text': '#8b0000'
  },
  ZA: {
    '--c-primary': '#007A4D',
    '--c-secondary': '#000000',
    '--c-accent': '#FFB612',
    '--c-hero-bg': '#0a1f4e',
    '--c-stripe1': '#007A4D',
    '--c-stripe2': '#FFB612',
    '--c-stripe3': '#000000',
    '--c-tag-bg': '#fff9e6',
    '--c-tag-text': '#b8860b'
  }
};

// ============================================================
// COUNTRY DATA — Election Information for Each Nation
// ============================================================
const COUNTRY_DATA = {
  DEFAULT: {
    flag: '🌍',
    name: 'Global',
    body: 'International Election Commission',
    system: 'Various',
    frequency: 'Varies by country',
    requirements: 'Varies by country',
    registration: 'Varies by country',
    methods: ['Varies by country'],
    timeline: [
      { phase: 'Phase 1', title: 'Preparation', desc: 'Election preparation begins', date: 'Varies', icon: '📋', side: 'left' },
      { phase: 'Phase 2', title: 'Campaign', desc: 'Official campaign period', date: 'Varies', icon: '📢', side: 'right' },
      { phase: 'Phase 3', title: 'Voting', desc: 'Election day voting', date: 'Varies', icon: '🗳', side: 'left' },
      { phase: 'Phase 4', title: 'Results', desc: 'Results announcement', date: 'Varies', icon: '📊', side: 'right' }
    ],
    checklist: [
      'Check voter registration status',
      'Verify ID requirements',
      'Find polling location',
      'Review ballot options',
      'Cast your vote on election day'
    ],
    quiz: []
  },
  IN: {
    flag: '🇮🇳',
    name: 'India',
    body: 'Election Commission of India',
    system: 'Parliamentary Democracy',
    frequency: '5 years (Lok Sabha)',
    requirements: 'Must be 18+ years old, Indian citizen',
    registration: 'Automatic registration through voter ID card',
    methods: ['Electronic Voting Machines (EVM)', 'Postal voting', 'Proxy voting'],
    timeline: [
      { phase: 'Phase 1', title: 'Notification', desc: 'Election notification issued', date: 'Feb-Mar', icon: '📢', side: 'left' },
      { phase: 'Phase 2', title: 'Nomination', desc: 'Candidate nominations', date: 'Mar-Apr', icon: '📝', side: 'right' },
      { phase: 'Phase 3', title: 'Campaign', desc: 'Official campaign period', date: 'Apr-May', icon: '📣', side: 'left' },
      { phase: 'Phase 4', title: 'Voting', desc: 'Multi-phase voting across states', date: 'Apr-Jun', icon: '🗳', side: 'right' },
      { phase: 'Phase 5', title: 'Counting', desc: 'Vote counting and results', date: 'Jun', icon: '📊', side: 'left' },
      { phase: 'Phase 6', title: 'Government', desc: 'New government formation', date: 'Jun-Jul', icon: '🏛', side: 'right' }
    ],
    checklist: [
      'Verify EPIC (Electoral Photo Identity Card)',
      'Check voter registration status online',
      'Find assigned polling station',
      'Review candidate list',
      'Arrive early on voting day',
      'Bring EPIC or alternative ID',
      'Cast vote using EVM'
    ],
    quiz: [
      { q: 'What is the minimum voting age in India?', opts: ['16', '18', '21', '25'], correct: 1, explanation: 'The minimum voting age in India is 18 years.' },
      { q: 'What does EVM stand for?', opts: ['Electronic Vote Machine', 'Electronic Voting Machine', 'Election Vote Monitor', 'Electoral Vote Method'], correct: 1, explanation: 'EVM stands for Electronic Voting Machine, used in Indian elections.' }
    ]
  },
  US: {
    flag: '🇺🇸',
    name: 'United States',
    body: 'Federal Election Commission',
    system: 'Federal Presidential Republic',
    frequency: '4 years (Presidential)',
    requirements: 'Must be 18+ years old, U.S. citizen',
    registration: 'State-specific registration requirements',
    methods: ['In-person voting', 'Mail-in voting', 'Early voting'],
    timeline: [
      { phase: 'Phase 1', title: 'Primaries', desc: 'Primary elections and caucuses', date: 'Jan-Jun', icon: '📊', side: 'left' },
      { phase: 'Phase 2', title: 'Conventions', desc: 'Party conventions', date: 'Jul-Aug', icon: '🏛', side: 'right' },
      { phase: 'Phase 3', title: 'Campaign', desc: 'General election campaign', date: 'Sep-Oct', icon: '📣', side: 'left' },
      { phase: 'Phase 4', title: 'Election Day', desc: 'Presidential election voting', date: 'Nov (1st Tue)', icon: '🗳', side: 'right' },
      { phase: 'Phase 5', title: 'Certification', desc: 'Results certification', date: 'Nov-Dec', icon: '✅', side: 'left' },
      { phase: 'Phase 6', title: 'Inauguration', desc: 'Presidential inauguration', date: 'Jan 20', icon: '🎉', side: 'right' }
    ],
    checklist: [
      'Register to vote in your state',
      'Check voter ID requirements',
      'Confirm registration status',
      'Request mail-in ballot if needed',
      'Find polling place location',
      'Vote on Election Day or early',
      'Verify vote was counted'
    ],
    quiz: [
      { q: 'When is Election Day in the US?', opts: ['First Monday in November', 'First Tuesday in November', 'Last Tuesday in October', 'First Wednesday in November'], correct: 1, explanation: 'Election Day is the first Tuesday after the first Monday in November.' },
      { q: 'What is the minimum voting age in the US?', opts: ['16', '18', '21', '25'], correct: 1, explanation: 'The minimum voting age in the United States is 18 years.' }
    ]
  },
  UK: {
    flag: '🇬🇧',
    name: 'United Kingdom',
    body: 'Electoral Commission',
    system: 'Parliamentary Democracy',
    frequency: '5 years (maximum)',
    requirements: 'Must be 18+ years old, UK citizen or resident',
    registration: 'Online registration through Gov.uk',
    methods: ['In-person voting', 'Postal voting', 'Proxy voting'],
    timeline: [
      { phase: 'Phase 1', title: 'Dissolution', desc: 'Parliament dissolution', date: 'Varies', icon: '🏛', side: 'left' },
      { phase: 'Phase 2', title: 'Nomination', desc: 'Candidate nominations', date: 'Varies', icon: '📝', side: 'right' },
      { phase: 'Phase 3', title: 'Campaign', desc: 'Official campaign period', date: 'Varies', icon: '📣', side: 'left' },
      { phase: 'Phase 4', title: 'Voting', desc: 'General election day', date: 'Varies (Thu)', icon: '🗳', side: 'right' },
      { phase: 'Phase 5', title: 'Counting', desc: 'Vote counting', date: 'Election night', icon: '📊', side: 'left' },
      { phase: 'Phase 6', title: 'Results', desc: 'Final results announcement', date: 'Next day', icon: '📈', side: 'right' }
    ],
    checklist: [
      'Register to vote online',
      'Check if you are registered',
      'Apply for postal vote if needed',
      'Find your polling station',
      'Bring acceptable ID',
      'Vote on election day',
      'Check results online'
    ],
    quiz: [
      { q: 'What is the maximum term length for UK Parliament?', opts: ['3 years', '4 years', '5 years', '6 years'], correct: 2, explanation: 'The maximum term for UK Parliament is 5 years, though elections can be called earlier.' },
      { q: 'What type of electoral system does the UK use?', opts: ['First-past-the-post', 'Proportional representation', 'Ranked choice', 'Mixed-member'], correct: 0, explanation: 'The UK uses a first-past-the-post electoral system.' }
    ]
  },
  AU: {
    flag: '🇦🇺',
    name: 'Australia',
    body: 'Australian Electoral Commission',
    system: 'Federal Parliamentary Democracy',
    frequency: '3 years (House), 6 years (Senate)',
    requirements: 'Must be 18+ years old, Australian citizen',
    registration: 'Compulsory registration',
    methods: ['Preferential voting', 'Postal voting', 'Early voting'],
    timeline: [
      { phase: 'Phase 1', title: 'Writ Issued', desc: 'Election writ issued', date: 'Varies', icon: '📜', side: 'left' },
      { phase: 'Phase 2', title: 'Nomination', desc: 'Candidate nominations', date: 'Varies', icon: '📝', side: 'right' },
      { phase: 'Phase 3', title: 'Campaign', desc: 'Election campaign', date: 'Varies', icon: '📣', side: 'left' },
      { phase: 'Phase 4', title: 'Early Voting', desc: 'Pre-poll and postal voting', date: 'Varies', icon: '📬', side: 'right' },
      { phase: 'Phase 5', title: 'Election Day', desc: 'Main election day', date: 'Saturday', icon: '🗳', side: 'left' },
      { phase: 'Phase 6', title: 'Counting', desc: 'Vote counting and results', date: 'Election night', icon: '📊', side: 'right' }
    ],
    checklist: [
      'Confirm enrollment (compulsory)',
      'Check enrollment details',
      'Apply for postal vote if needed',
      'Find polling place',
      'Vote on election day',
      'Check results online'
    ],
    quiz: [
      { q: 'When do Australian federal elections usually occur?', opts: ['Every 2 years', 'Every 3 years', 'Every 4 years', 'Every 5 years'], correct: 1, explanation: 'Australian House of Representatives elections occur every 3 years.' },
      { q: 'What type of voting system does Australia use?', opts: ['First-past-the-post', 'Preferential voting', 'Proportional representation', 'Mixed-member'], correct: 1, explanation: 'Australia uses a preferential voting system.' }
    ]
  },
  CA: {
    flag: '🇨🇦',
    name: 'Canada',
    body: 'Elections Canada',
    system: 'Federal Parliamentary Democracy',
    frequency: '4 years (maximum)',
    requirements: 'Must be 18+ years old, Canadian citizen',
    registration: 'Automatic registration at age 18',
    methods: ['In-person voting', 'Mail-in voting', 'Advance voting'],
    timeline: [
      { phase: 'Phase 1', title: 'Dissolution', desc: 'Parliament dissolution', date: 'Varies', icon: '🏛', side: 'left' },
      { phase: 'Phase 2', title: 'Nomination', desc: 'Candidate nominations', date: 'Varies', icon: '📝', side: 'right' },
      { phase: 'Phase 3', title: 'Campaign', desc: 'Election campaign', date: 'Varies', icon: '📣', side: 'left' },
      { phase: 'Phase 4', title: 'Advance Voting', desc: 'Early voting period', date: 'Varies', icon: '📅', side: 'right' },
      { phase: 'Phase 5', title: 'Election Day', desc: 'Federal election day', date: 'Monday', icon: '🗳', side: 'left' },
      { phase: 'Phase 6', title: 'Results', desc: 'Results and certification', date: 'Election night', icon: '📊', side: 'right' }
    ],
    checklist: [
      'Confirm voter registration',
      'Check ID requirements',
      'Apply for special ballot if needed',
      'Find polling station',
      'Vote on election day',
      'Verify vote was recorded'
    ],
    quiz: [
      { q: 'What is the maximum term for Canadian Parliament?', opts: ['3 years', '4 years', '5 years', '6 years'], correct: 1, explanation: 'The maximum term for Canadian Parliament is 4 years.' },
      { q: 'When do Canadian federal elections occur?', opts: ['Every 2 years', 'Every 3 years', 'Every 4 years', 'Every 5 years'], correct: 2, explanation: 'Canadian federal elections occur every 4 years at most.' }
    ]
  },
  FR: {
    flag: '🇫🇷',
    name: 'France',
    body: 'Commission nationale des comptes de campagne',
    system: 'Semi-presidential Republic',
    frequency: '5 years (President)',
    requirements: 'Must be 18+ years old, French citizen',
    registration: 'Automatic registration',
    methods: ['In-person voting', 'Postal voting', 'Proxy voting'],
    timeline: [
      { phase: 'Phase 1', title: 'Announcement', desc: 'Election announcement', date: 'Varies', icon: '📢', side: 'left' },
      { phase: 'Phase 2', title: 'Campaign', desc: 'Official campaign period', date: 'Varies', icon: '📣', side: 'right' },
      { phase: 'Phase 3', title: 'First Round', desc: 'First round voting', date: 'Varies', icon: '🗳', side: 'left' },
      { phase: 'Phase 4', title: 'Second Round', desc: 'Runoff voting if needed', date: 'Varies', icon: '🔄', side: 'right' },
      { phase: 'Phase 5', title: 'Results', desc: 'Final results', date: 'Varies', icon: '📊', side: 'left' },
      { phase: 'Phase 6', title: 'Inauguration', desc: 'Presidential inauguration', date: 'Varies', icon: '🎉', side: 'right' }
    ],
    checklist: [
      'Confirm voter registration',
      'Check polling station',
      'Vote in first round',
      'Vote in second round if needed',
      'Verify vote was counted'
    ],
    quiz: [
      { q: 'How many rounds can French presidential elections have?', opts: ['1', '2', '3', '4'], correct: 1, explanation: 'French presidential elections can have up to 2 rounds.' },
      { q: 'What is the term length for French presidents?', opts: ['3 years', '4 years', '5 years', '6 years'], correct: 2, explanation: 'French presidents serve 5-year terms.' }
    ]
  },
  DE: {
    flag: '🇩🇪',
    name: 'Germany',
    body: 'Federal Returning Officer',
    system: 'Federal Parliamentary Republic',
    frequency: '4 years',
    requirements: 'Must be 18+ years old, EU citizen',
    registration: 'Residence registration required',
    methods: ['In-person voting', 'Postal voting', 'Proxy voting'],
    timeline: [
      { phase: 'Phase 1', title: 'Announcement', desc: 'Election announcement', date: 'Varies', icon: '📢', side: 'left' },
      { phase: 'Phase 2', title: 'Campaign', desc: 'Election campaign', date: 'Varies', icon: '📣', side: 'right' },
      { phase: 'Phase 3', title: 'Advance Voting', desc: 'Early voting period', date: 'Varies', icon: '📅', side: 'left' },
      { phase: 'Phase 4', title: 'Election Day', desc: 'Federal election day', date: 'Sunday', icon: '🗳', side: 'right' },
      { phase: 'Phase 5', title: 'Counting', desc: 'Vote counting', date: 'Election night', icon: '📊', side: 'left' },
      { phase: 'Phase 6', title: 'Coalition', desc: 'Government formation', date: 'Varies', icon: '🤝', side: 'right' }
    ],
    checklist: [
      'Register to vote',
      'Confirm registration',
      'Apply for postal vote if needed',
      'Find polling station',
      'Vote on election day',
      'Check results online'
    ],
    quiz: [
      { q: 'What electoral system does Germany use?', opts: ['First-past-the-post', 'Proportional representation', 'Mixed-member proportional', 'Ranked choice'], correct: 2, explanation: 'Germany uses a mixed-member proportional representation system.' },
      { q: 'When do German federal elections occur?', opts: ['Every 3 years', 'Every 4 years', 'Every 5 years', 'Every 6 years'], correct: 1, explanation: 'German federal elections occur every 4 years.' }
    ]
  },
  ZA: {
    flag: '🇿🇦',
    name: 'South Africa',
    body: 'Electoral Commission of South Africa',
    system: 'Parliamentary Republic',
    frequency: '5 years',
    requirements: 'Must be 18+ years old, South African citizen',
    registration: 'Voter registration required',
    methods: ['In-person voting', 'Postal voting', 'Special voting'],
    timeline: [
      { phase: 'Phase 1', title: 'Announcement', desc: 'Election announcement', date: 'Varies', icon: '📢', side: 'left' },
      { phase: 'Phase 2', title: 'Registration', desc: 'Voter registration period', date: 'Varies', icon: '📝', side: 'right' },
      { phase: 'Phase 3', title: 'Campaign', desc: 'Election campaign', date: 'Varies', icon: '📣', side: 'left' },
      { phase: 'Phase 4', title: 'Voting', desc: 'Election day voting', date: 'Varies', icon: '🗳', side: 'right' },
      { phase: 'Phase 5', title: 'Counting', desc: 'Vote counting', date: 'Varies', icon: '📊', side: 'left' },
      { phase: 'Phase 6', title: 'Results', desc: 'Final results', date: 'Varies', icon: '📈', side: 'right' }
    ],
    checklist: [
      'Register to vote',
      'Get voter ID',
      'Find voting station',
      'Vote on election day',
      'Verify vote was recorded'
    ],
    quiz: [
      { q: 'What is the minimum voting age in South Africa?', opts: ['16', '18', '21', '25'], correct: 1, explanation: 'The minimum voting age in South Africa is 18 years.' },
      { q: 'When do South African national elections occur?', opts: ['Every 3 years', 'Every 4 years', 'Every 5 years', 'Every 6 years'], correct: 2, explanation: 'South African national elections occur every 5 years.' }
    ]
  }
};

// ============================================================
// HERO CONTENT — Country-Specific Hero Text and Stats
// ============================================================
const HERO_CONTENT = {
  DEFAULT: {
    eyebrow: 'Global Election Hub',
    h1a: 'Your Vote.',
    h1b: 'Your Democracy.',
    para: 'Get personalized election guidance for countries around the world. Powered by AI.',
    stat1n: '2B+', stat1l: 'Global Voters',
    stat2n: '195', stat2l: 'Countries',
    stat3n: 'AI', stat3l: 'Powered',
    bodyName: 'International Election Commission'
  },
  IN: {
    eyebrow: 'Election Commission of India · Official Guide',
    h1a: 'Your Vote.',
    h1b: 'Your Democracy.',
    para: 'Get the complete guide to India\'s election process — from voter registration and EVM voting to results day. Powered by AI.',
    stat1n: '970M+', stat1l: 'Registered Voters',
    stat2n: '7 Phases', stat2l: 'Voting Phases',
    stat3n: 'EVM', stat3l: 'Technology',
    bodyName: 'Election Commission of India'
  },
  US: {
    eyebrow: 'Federal Election Commission · Official Guide',
    h1a: 'Your Vote.',
    h1b: 'Your Democracy.',
    para: 'Navigate the U.S. election process with confidence — from primaries to inauguration. Get personalized guidance powered by AI.',
    stat1n: '168M', stat1l: 'Registered Voters',
    stat2n: '50 States', stat2l: 'Plus D.C.',
    stat3n: 'Nov 5', stat3l: 'Election Day',
    bodyName: 'Federal Election Commission'
  },
  UK: {
    eyebrow: 'Electoral Commission · Official Guide',
    h1a: 'Your Vote.',
    h1b: 'Your Democracy.',
    para: 'Master the UK electoral system — from registration to parliament. Get expert AI guidance for every step.',
    stat1n: '47M', stat1l: 'Registered Voters',
    stat2n: '650', stat2l: 'Parliament Seats',
    stat3n: 'FPTP', stat3l: 'System',
    bodyName: 'Electoral Commission'
  },
  AU: {
    eyebrow: 'Australian Electoral Commission · Official Guide',
    h1a: 'Your Vote.',
    h1b: 'Your Democracy.',
    para: 'Navigate Australia\'s democratic process — from compulsory voting to preferential ballots. AI-powered guidance available.',
    stat1n: '17M', stat1l: 'Enrolled Voters',
    stat2n: 'Compulsory', stat2l: 'Voting',
    stat3n: 'Preferential', stat3l: 'System',
    bodyName: 'Australian Electoral Commission'
  },
  CA: {
    eyebrow: 'Elections Canada · Official Guide',
    h1a: 'Your Vote.',
    h1b: 'Your Democracy.',
    para: 'Experience Canada\'s electoral process — from automatic registration to advance voting. Get personalized AI assistance.',
    stat1n: '27M', stat1l: 'Eligible Voters',
    stat2n: '338', stat2l: 'Riding Seats',
    stat3n: 'FPTP', stat3l: 'System',
    bodyName: 'Elections Canada'
  },
  FR: {
    eyebrow: 'French Electoral Commission · Official Guide',
    h1a: 'Your Vote.',
    h1b: 'Your Democracy.',
    para: 'Master France\'s two-round presidential system — from registration to runoff elections. AI guidance available.',
    stat1n: '48M', stat1l: 'Registered Voters',
    stat2n: '2 Rounds', stat2l: 'Max System',
    stat3n: '5 Years', stat3l: 'Term Length',
    bodyName: 'Commission nationale des comptes de campagne'
  },
  DE: {
    eyebrow: 'Federal Returning Officer · Official Guide',
    h1a: 'Your Vote.',
    h1b: 'Your Democracy.',
    para: 'Navigate Germany\'s mixed-member proportional system — from registration to coalition formation. AI assistance ready.',
    stat1n: '61M', stat1l: 'Eligible Voters',
    stat2n: 'Mixed', stat2l: 'Proportional',
    stat3n: '4 Years', stat3l: 'Term Length',
    bodyName: 'Federal Returning Officer'
  },
  ZA: {
    eyebrow: 'Electoral Commission of South Africa · Official Guide',
    h1a: 'Your Vote.',
    h1b: 'Your Democracy.',
    para: 'Experience South Africa\'s electoral process — from registration to results. Get AI-powered guidance for every step.',
    stat1n: '27M', stat1l: 'Registered Voters',
    stat2n: '400', stat2l: 'Parliament Seats',
    stat3n: 'PR', stat3l: 'System',
    bodyName: 'Electoral Commission of South Africa'
  }
};

// ============================================================
// QUIZ POOL — General Election Knowledge Questions
// ============================================================
const QUIZ_POOL = [
  { q: 'What is voter suppression?', opts: ['Encouraging people to vote', 'Preventing eligible voters from voting', 'Counting votes accurately', 'Registering new voters'], correct: 1, explanation: 'Voter suppression refers to efforts to prevent eligible voters from participating in elections.' },
  { q: 'What is gerrymandering?', opts: ['Drawing fair districts', 'Manipulating district boundaries for political advantage', 'Counting votes manually', 'Registering voters online'], correct: 1, explanation: 'Gerrymandering is the manipulation of electoral district boundaries to favor one party.' },
  { q: 'What does "universal suffrage" mean?', opts: ['Only landowners can vote', 'All adult citizens can vote', 'Only men can vote', 'Only property owners can vote'], correct: 1, explanation: 'Universal suffrage means that all adult citizens have the right to vote.' }
];

// ============================================================
// QUICK TOPICS — AI Chat Suggestions
// ============================================================
const QUICK_TOPICS = [
  'How do I register to vote?',
  'What ID do I need to vote?',
  'When is election day?',
  'How does voting work?',
  'What are my voting rights?',
  'How to find my polling place?',
  'What is voter fraud?',
  'How are elections funded?'
];

// ============================================================
// DEMO RESPONSES — Fallback for AI Chat
// ============================================================
const DEMO_RESPONSES = {
  register: '**Voter Registration**\n\nTo register to vote, you typically need to:\n- Be a citizen of voting age (usually 18+)\n- Provide proof of identity and residence\n- Register through your local election office\n- Some countries have automatic registration\n\nCheck your country\'s specific requirements for details.',
  id: '**Voter ID Requirements**\n\nID requirements vary by country:\n- Some require government-issued photo ID\n- Others accept utility bills or bank statements\n- Many allow multiple forms of identification\n- Some countries have no ID requirements\n\nAlways check your local election office for current rules.',
  rights: '**Voting Rights**\n\nYour voting rights typically include:\n- The right to vote if you meet age/citizenship requirements\n- Protection from voter suppression\n- Access to accurate election information\n- The ability to vote privately and securely\n- Equal treatment regardless of background\n\nRights can vary by country and jurisdiction.',
  dates: '**Election Dates**\n\nElection timing can vary by country, but typically:\n- National elections are announced by the election commission\n- Some countries schedule voting on a specific weekday or month\n- Many hold early voting or advance voting before the main day\n- Multi-stage elections may span several weeks\n\nCheck your country\'s election authority for the exact date and deadlines.',
  counting: '**Vote Counting**\n\nVote counting is handled by the election authority and often includes:\n- Secure collection of ballots from polling stations\n- Counting at authorized counting centers\n- Verification of totals and resolving discrepancies\n- Announcement of provisional and final results\n\nDifferent countries have different certification and result timelines.',
  default: '**Election Questions**\n\nI\'m here to help with any questions about elections and voting! Ask me about:\n- Registration requirements\n- Voting procedures\n- Election timelines\n- Your voting rights\n- Polling locations\n- Election security\n\nWhat would you like to know?'
};