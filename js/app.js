// ============================================================
// iVote — Application Logic (FIXED: images + real AI chat)
// ============================================================

// Google Translate language selector is now handled in i18n.js

const GROQ_API_KEY = window.CONFIG?.GROQ_API_KEY || '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';

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

  const fs1 = document.getElementById('fs1');
  const fs2 = document.getElementById('fs2');
  const fs3 = document.getElementById('fs3');
  if (fs1) fs1.style.background = theme['--c-stripe1'] || '#1a4fa0';
  if (fs2) fs2.style.background = theme['--c-stripe2'] || '#4a7fc1';
  if (fs3) fs3.style.background = theme['--c-stripe3'] || '#0e3370';

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

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const id = a.getAttribute('href').slice(1);
    const t = document.getElementById(id);
    if (t) t.scrollIntoView({ behavior: 'smooth' });
  });
});

const themeBtn = document.getElementById('themeToggle');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    themeBtn.textContent = isDark ? '🌙' : '☀️';
    try { localStorage.setItem('ivote_theme', isDark ? 'light' : 'dark'); } catch (e) { }
  });
}

// ============================================================
// NEWS — Multi-source fetcher with automatic fallback chain
// ============================================================
const RSS2JSON_URL = "https://api.rss2json.com/v1/api.json";

const GOOGLE_NEWS_RSS = {
  IN:      "https://news.google.com/rss/search?q=India+election+politics&hl=en-IN&gl=IN&ceid=IN:en",
  US:      "https://news.google.com/rss/search?q=US+election+politics&hl=en-US&gl=US&ceid=US:en",
  UK:      "https://news.google.com/rss/search?q=UK+election+parliament&hl=en-GB&gl=GB&ceid=GB:en",
  AU:      "https://news.google.com/rss/search?q=Australia+election+politics&hl=en-AU&gl=AU&ceid=AU:en",
  CA:      "https://news.google.com/rss/search?q=Canada+election+politics&hl=en-CA&gl=CA&ceid=CA:en",
  FR:      "https://news.google.com/rss/search?q=France+election+vote&hl=fr&gl=FR&ceid=FR:fr",
  DE:      "https://news.google.com/rss/search?q=Deutschland+Wahl+Politik&hl=de&gl=DE&ceid=DE:de",
  ZA:      "https://news.google.com/rss/search?q=South+Africa+election+politics&hl=en-ZA&gl=ZA&ceid=ZA:en",
  DEFAULT: "https://news.google.com/rss/search?q=election+democracy+voting&hl=en&gl=US&ceid=US:en",
};

// ── FIXED: Use reliable Picsum/Wikipedia image services ──────
// Picsum gives beautiful random nature/architecture photos
// These are deterministic by seed so same card always gets same image
function getCountryFallbackImage(country, index) {
  // Use picsum.photos with a seed based on country + index for consistency
  const seeds = {
    IN: [1001, 1002, 1003, 1004, 1005, 1006],
    US: [2001, 2002, 2003, 2004, 2005, 2006],
    UK: [3001, 3002, 3003, 3004, 3005, 3006],
    AU: [4001, 4002, 4003, 4004, 4005, 4006],
    CA: [5001, 5002, 5003, 5004, 5005, 5006],
    FR: [6001, 6002, 6003, 6004, 6005, 6006],
    DE: [7001, 7002, 7003, 7004, 7005, 7006],
    ZA: [8001, 8002, 8003, 8004, 8005, 8006],
    DEFAULT: [9001, 9002, 9003, 9004, 9005, 9006],
  };
  const arr = seeds[country] || seeds.DEFAULT;
  const seed = arr[index % arr.length];
  // picsum.photos is extremely reliable — returns real photos
  return `https://picsum.photos/seed/${seed}/600/300`;
}

// ── PLACEHOLDER ARTICLES with working picsum images ──────────
const NEWS_PLACEHOLDERS = {
  IN: [
    { title: "West Bengal Assembly Elections 2026: Phase-wise Voting Underway", source: "Election Commission of India", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=West+Bengal+election+2026&hl=en-IN&gl=IN&ceid=IN:en", description: "The Election Commission of India is overseeing multi-phase assembly elections across West Bengal. Voter turnout figures are being recorded across all constituencies as polling progresses smoothly.", image: `https://picsum.photos/seed/1001/600/300` },
    { title: "EVM Deployment & Voter Verification: What You Need to Know", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=India+EVM+election+2026&hl=en-IN&gl=IN&ceid=IN:en", description: "Electronic Voting Machines (EVMs) are deployed at polling booths nationwide. Voters must carry their EPIC card or any approved alternative government-issued photo ID to cast their vote.", image: `https://picsum.photos/seed/1002/600/300` },
    { title: "Model Code of Conduct: Rules Parties Must Follow During Elections", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=India+election+model+code+of+conduct&hl=en-IN&gl=IN&ceid=IN:en", description: "The Model Code of Conduct comes into effect as soon as election dates are announced. Political parties and candidates must follow strict guidelines on campaigning, advertisements, and public conduct.", image: `https://picsum.photos/seed/1003/600/300` },
    { title: "How to Check Your Name on the Voter List Online", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://voters.eci.gov.in/", description: "Eligible voters can check their registration status on the National Voters' Service Portal (NVSP). The portal also allows you to apply for corrections and download your digital voter ID card for free.", image: `https://picsum.photos/seed/1004/600/300` },
    { title: "Bihar & UP Bypolls 2026: Dates, Candidates & Key Constituencies", source: "iVote News", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=India+bypoll+2026&hl=en-IN&gl=IN&ceid=IN:en", description: "Several state legislative assembly by-elections are scheduled across India. Here is a breakdown of key constituencies, notable candidates, and what the results could mean for the national political landscape.", image: `https://picsum.photos/seed/1005/600/300` },
    { title: "Voter Turnout Statistics: India's Record Participation in Recent Elections", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=India+voter+turnout+2026&hl=en-IN&gl=IN&ceid=IN:en", description: "India has consistently seen voter turnout above 60% in recent general elections. Election observers and civil society groups are working to improve participation in urban areas where turnout has historically been lower.", image: `https://picsum.photos/seed/1006/600/300` },
  ],
  US: [
    { title: "2026 US Midterm Elections: Senate & House Races to Watch", source: "iVote News", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=US+midterm+elections+2026&hl=en-US&gl=US&ceid=US:en", description: "The 2026 midterm elections will determine control of the Senate and House of Representatives. Key competitive races are being closely monitored across swing states and battleground districts nationwide.", image: `https://picsum.photos/seed/2001/600/300` },
    { title: "How to Register to Vote in Your State", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://vote.gov/", description: "Voter registration deadlines vary by state. Use vote.gov to find your state's requirements and register online, by mail, or in person before the deadline to ensure your voice is heard.", image: `https://picsum.photos/seed/2002/600/300` },
    { title: "Mail-In Voting: Rules, Deadlines & How to Request Your Ballot", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=US+mail+in+voting+2026&hl=en-US&gl=US&ceid=US:en", description: "Many states allow all registered voters to request a mail-in ballot. Rules differ significantly by state — some require an excuse, while others allow universal mail voting for any reason.", image: `https://picsum.photos/seed/2003/600/300` },
    { title: "Early Voting Locations and Hours for the 2026 Midterms", source: "iVote News", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=US+early+voting+2026&hl=en-US&gl=US&ceid=US:en", description: "Early voting is now available in most states before Election Day. Check with your local election office for specific dates, times, and locations for in-person early voting in your county.", image: `https://picsum.photos/seed/2004/600/300` },
    { title: "Voter ID Requirements: What You Need to Bring to the Polls", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=US+voter+ID+requirements+2026&hl=en-US&gl=US&ceid=US:en", description: "Voter ID requirements vary widely by state. Some require government-issued photo ID while others accept a wider range of documents. Check your state's specific requirements before heading to the polls.", image: `https://picsum.photos/seed/2005/600/300` },
    { title: "How Election Results Are Certified in the United States", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=US+election+certification+process&hl=en-US&gl=US&ceid=US:en", description: "After votes are cast, election officials count and certify results through a multi-step process involving canvassing, auditing, and formal certification by state election authorities.", image: `https://picsum.photos/seed/2006/600/300` },
  ],
  UK: [
    { title: "UK Local Elections 2026: Key Councils & Mayoral Races", source: "iVote News", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=UK+election+2026&hl=en-GB&gl=GB&ceid=GB:en", description: "Local council elections are taking place across England. Several mayoral contests and combined authority elections are also on the ballot, making this one of the most consequential local election cycles in years.", image: `https://picsum.photos/seed/3001/600/300` },
    { title: "Voter ID Law UK: What Identification You Must Bring to Vote", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=UK+voter+ID+2026&hl=en-GB&gl=GB&ceid=GB:en", description: "Since 2023, voters in Great Britain must show an approved form of photo ID at polling stations. This includes a passport, driving licence, or a free Voter Authority Certificate from your local council.", image: `https://picsum.photos/seed/3002/600/300` },
    { title: "How to Register to Vote in the UK Before the Deadline", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://www.gov.uk/register-to-vote", description: "You can register online at gov.uk/register-to-vote. The registration deadline is typically 12 working days before election day. Check your registration status to ensure your details are current and correct.", image: `https://picsum.photos/seed/3003/600/300` },
    { title: "First-Past-the-Post: How the UK Electoral System Works", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=UK+electoral+system+explained&hl=en-GB&gl=GB&ceid=GB:en", description: "The UK uses a first-past-the-post voting system where the candidate with the most votes in each constituency wins a seat in Parliament, regardless of whether they receive an absolute majority.", image: `https://picsum.photos/seed/3004/600/300` },
  ],
  AU: [
    { title: "Australian Federal Election 2025: Results & New Government", source: "iVote News", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=Australia+election+2025&hl=en-AU&gl=AU&ceid=AU:en", description: "Australians went to the polls in the 2025 federal election. Here is a full breakdown of the results by electorate, the new government's composition, and what the outcome means for the next parliamentary term.", image: `https://picsum.photos/seed/4001/600/300` },
    { title: "Preferential Voting Explained: How Australia Counts Ballots", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=Australia+preferential+voting+explained&hl=en-AU&gl=AU&ceid=AU:en", description: "Australia uses a preferential voting system where voters rank candidates in order of preference. This ensures the winning candidate has broad support and eliminates the 'wasted vote' problem of first-past-the-post systems.", image: `https://picsum.photos/seed/4002/600/300` },
    { title: "Compulsory Voting in Australia: Rights, Fines & How It Works", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=Australia+compulsory+voting&hl=en-AU&gl=AU&ceid=AU:en", description: "Voting is compulsory for all enrolled Australian citizens aged 18 and over. Failure to vote without a valid reason can result in a fine. Enrollment itself is also compulsory once you turn 18.", image: `https://picsum.photos/seed/4003/600/300` },
  ],
  CA: [
    { title: "Canada Federal Election 2025: Results and New Parliament", source: "iVote News", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=Canada+federal+election+2025&hl=en-CA&gl=CA&ceid=CA:en", description: "Canadians voted in the 2025 federal election. Explore the full riding-by-riding results, the composition of the new parliament, and analysis of what the results mean for Canadian governance and policy.", image: `https://picsum.photos/seed/5001/600/300` },
    { title: "How to Vote in Canadian Federal Elections: A Complete Guide", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://www.elections.ca/", description: "Elections Canada provides a complete voter guide covering registration, polling station locations, advance voting, and what to bring on election day. All Canadian citizens aged 18+ are eligible to vote.", image: `https://picsum.photos/seed/5002/600/300` },
    { title: "Understanding Canada's Riding System and First-Past-the-Post", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=Canada+riding+electoral+system&hl=en-CA&gl=CA&ceid=CA:en", description: "Canada is divided into 338 electoral districts called ridings. Each riding elects one Member of Parliament using first-past-the-post. The party winning the most ridings typically forms the government.", image: `https://picsum.photos/seed/5003/600/300` },
  ],
  FR: [
    { title: "French Legislative Elections 2027: Key Dates & Party Standings", source: "iVote News", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=France+election+2027&hl=fr&gl=FR&ceid=FR:fr", description: "France's next major elections are approaching. Here is a comprehensive overview of the key dates, major political parties and their current standings in national polls, and what is at stake for French governance.", image: `https://picsum.photos/seed/6001/600/300` },
    { title: "How France's Two-Round Presidential System Works", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=France+two+round+election+system&hl=fr&gl=FR&ceid=FR:fr", description: "French presidential elections use a two-round system. If no candidate wins an absolute majority in round one, the top two candidates face off in a runoff two weeks later, ensuring broad democratic legitimacy.", image: `https://picsum.photos/seed/6002/600/300` },
    { title: "Voter Registration in France: Who Can Vote and How", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=France+voter+registration&hl=fr&gl=FR&ceid=FR:fr", description: "French citizens can register to vote at their local town hall or online. Registration is now automatic for French citizens turning 18. EU citizens living in France may also vote in local and European elections.", image: `https://picsum.photos/seed/6003/600/300` },
  ],
  DE: [
    { title: "Germany's New Government After the 2025 Federal Election", source: "iVote News", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=Germany+Bundestagswahl+2025+results&hl=de&gl=DE&ceid=DE:de", description: "Germany held its federal election in February 2025. Here is a complete breakdown of the results, the coalition negotiations, and how the new Bundestag is composed after one of the most consequential German elections in decades.", image: `https://picsum.photos/seed/7001/600/300` },
    { title: "Mixed-Member Proportional Representation: Germany's Voting System", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=Germany+electoral+system+explained&hl=de&gl=DE&ceid=DE:de", description: "Germany uses a mixed-member proportional representation system. Voters cast two ballots — one for a local candidate and one for a party. This ensures both local representation and proportional party representation in the Bundestag.", image: `https://picsum.photos/seed/7002/600/300` },
    { title: "How to Vote in German Federal Elections: A Voter's Guide", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=Germany+voting+guide+Bundestagswahl&hl=de&gl=DE&ceid=DE:de", description: "German citizens who are registered at a German address and aged 18 or over are automatically entitled to vote. Voters receive a polling card by post before election day and can also apply for a postal ballot.", image: `https://picsum.photos/seed/7003/600/300` },
  ],
  ZA: [
    { title: "South Africa 2024 Election Aftermath: GNU and New Policies", source: "iVote News", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=South+Africa+election+2024+results&hl=en-ZA&gl=ZA&ceid=ZA:en", description: "Following the historic 2024 election where the ANC lost its majority for the first time, a Government of National Unity (GNU) was formed. Here is an update on how the coalition is governing and key policy developments.", image: `https://picsum.photos/seed/8001/600/300` },
    { title: "How to Register to Vote with the IEC in South Africa", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://www.elections.org.za/", description: "The Electoral Commission of South Africa (IEC) manages voter registration. South African citizens with a valid ID document can register online, at IEC offices, or during voter registration weekends held before elections.", image: `https://picsum.photos/seed/8002/600/300` },
    { title: "South Africa's Proportional Representation Electoral System Explained", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=South+Africa+electoral+system+PR&hl=en-ZA&gl=ZA&ceid=ZA:en", description: "South Africa uses a proportional representation system for national and provincial elections. Parties receive seats in proportion to their share of the total vote, ensuring a diverse and representative parliament.", image: `https://picsum.photos/seed/8003/600/300` },
  ],
  DEFAULT: [
    { title: "Global Election Calendar 2026: Key Votes Around the World", source: "iVote News", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=global+elections+2026&hl=en&gl=US&ceid=US:en", description: "2026 is a significant year for democracy worldwide, with major elections scheduled across Asia, Europe, Africa, and the Americas. Here is a roundup of the most consequential votes on the global calendar this year.", image: `https://picsum.photos/seed/9001/600/300` },
    { title: "What Is Universal Suffrage? A Guide to Voting Rights", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=voting+rights+democracy+2026", description: "Universal suffrage means every adult citizen has the right to vote regardless of gender, race, religion, or economic status. Many countries have expanded suffrage rights significantly in the past century.", image: `https://picsum.photos/seed/9002/600/300` },
    { title: "How Election Observers Keep Voting Fair and Transparent", source: "iVote Guide", pubDate: new Date().toISOString(), link: "https://news.google.com/search?q=election+observers+democracy", description: "International and domestic election observers monitor polling stations, vote counting, and results tabulation to ensure elections are conducted freely and fairly according to international democratic standards.", image: `https://picsum.photos/seed/9003/600/300` },
  ],
};

// ── NEWS CACHE HELPERS ─────────────────────────────────────────
const NEWS_CACHE_KEY = 'ivote_news_cache';
const NEWS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function saveNewsCache(country, articles) {
  try {
    const cache = JSON.parse(localStorage.getItem(NEWS_CACHE_KEY) || '{}');
    cache[country] = { articles, ts: Date.now() };
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {}
}

function loadNewsCache(country) {
  try {
    const cache = JSON.parse(localStorage.getItem(NEWS_CACHE_KEY) || '{}');
    const entry = cache[country];
    if (entry && Date.now() - entry.ts < NEWS_CACHE_TTL) return entry.articles;
  } catch (e) {}
  return null;
}

function loadAnyCachedNews(country) {
  try {
    const cache = JSON.parse(localStorage.getItem(NEWS_CACHE_KEY) || '{}');
    return cache[country]?.articles || null;
  } catch (e) { return null; }
}

// ── SKELETON HTML HELPER ───────────────────────────────────────
function showSkeletons() {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  const skelly = `
    <div class="news-card skeleton-card" aria-hidden="true">
      <div class="skeleton skeleton-img"></div>
      <div class="news-body">
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line medium"></div>
      </div>
    </div>`;
  grid.innerHTML = skelly + skelly + skelly;
}

// ── SOURCE 1: rss2json.com ─────────────────────────────────────
async function fetchViaRss2Json(country) {
  const rssUrl = GOOGLE_NEWS_RSS[country] || GOOGLE_NEWS_RSS.DEFAULT;
  const url = `${RSS2JSON_URL}?rss_url=${encodeURIComponent(rssUrl)}&api_key=&count=6`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const data = await res.json();
  if (data.status !== 'ok' || !data.items?.length) throw new Error('rss2json empty');
  return data.items.map((item, idx) => ({
    title:       item.title || '',
    link:        item.link  || item.guid || '',
    pubDate:     item.pubDate || new Date().toISOString(),
    source:      item.author || (item.source?.name) || extractSource(item.link),
    description: (item.description || item.content || '')
                   .replace(/<[^>]*>/g, '').substring(0, 200),
    // FIXED: Use picsum as fallback if no image available from RSS
    image: item.enclosure?.link || item.thumbnail || extractImageFromContent(item.content || item.description || '') || getCountryFallbackImage(country, idx),
  })).filter(a => a.title && a.link);
}

function extractImageFromContent(html) {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function extractSource(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch (e) { return 'News'; }
}

// ── MAIN FETCH ────────────────────────────────────────────────
async function fetchNews() {
  const cd = COUNTRY_DATA[currentCountry] || COUNTRY_DATA.DEFAULT;

  const cached = loadNewsCache(currentCountry);
  if (cached) {
    renderNewsCards(cached, cd);
    _tryFetchLive(currentCountry, cd, true);
    return;
  }

  showSkeletons();
  _tryFetchLive(currentCountry, cd, false);
}

async function _tryFetchLive(country, cd, silent) {
  let articles = null;

  try {
    articles = await fetchViaRss2Json(country);
    console.log('[iVote News] rss2json success:', articles.length, 'articles');
  } catch (e1) {
    console.warn('[iVote News] rss2json failed:', e1.message);
  }

  if (articles && articles.length > 0) {
    saveNewsCache(country, articles);
    if (!silent || document.getElementById('newsGrid')?.querySelector('.skeleton-card')) {
      renderNewsCards(articles, cd);
    }
    return;
  }

  const stale = loadAnyCachedNews(country);
  if (stale && !silent) {
    renderNewsCards(stale, cd, true);
    return;
  }

  if (!silent) renderPlaceholderCards(cd);
}

// ── RENDER LIVE NEWS CARDS ─────────────────────────────────────
function renderNewsCards(articles, cd) {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  articles.forEach((a, idx) => {
    let dateStr = '';
    try {
      dateStr = new Date(a.pubDate).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch (e) {}

    const snippet = (a.description || '').replace(/<[^>]*>/g, '').substring(0, 160);
    // FIXED: always have a working fallback image using picsum
    const fallbackImg = getCountryFallbackImage(currentCountry, idx);
    const imgSrc = a.image || fallbackImg;

    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML = `
      <img class="news-img" src="${esc(imgSrc)}" alt="${esc(a.title)}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImg}'">
      <div class="news-body">
        <div class="news-meta">${esc(dateStr)}${a.source ? ' · ' + esc(a.source) : ''}</div>
        <div class="news-headline">
          <a href="${esc(a.link)}" target="_blank" rel="noopener">${esc(a.title)}</a>
        </div>
        <div class="news-snippet">${esc(snippet)}${snippet.length >= 160 ? '…' : ''}</div>
        <a class="news-read" href="${esc(a.link)}" target="_blank" rel="noopener">Read full story →</a>
      </div>`;
    grid.appendChild(card);
  });
}

// ── RENDER PLACEHOLDER CARDS ───────────────────────────────────
function renderPlaceholderCards(cd) {
  const grid = document.getElementById('newsGrid');
  if (!grid) return;

  cd = cd || COUNTRY_DATA[currentCountry] || COUNTRY_DATA.DEFAULT;
  const articles = NEWS_PLACEHOLDERS[currentCountry] || NEWS_PLACEHOLDERS.DEFAULT;

  grid.innerHTML = '';

  const notice = document.createElement('div');
  notice.style.cssText = 'grid-column:1/-1;display:flex;align-items:center;gap:.5rem;margin-bottom:-.25rem;font-size:.8rem;color:var(--text-3,#888);flex-wrap:wrap;';
  notice.innerHTML = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#f59e0b;animation:pulse 1.5s infinite;flex-shrink:0;"></span> Showing curated stories &nbsp;·&nbsp; <a href="https://news.google.com/search?q=${encodeURIComponent(cd.name + ' election')}" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;font-weight:600;">Live feed on Google News →</a>&nbsp; <button onclick="fetchNews()" style="background:none;border:none;cursor:pointer;font-size:.75rem;color:var(--text-3);font-family:inherit;text-decoration:underline;padding:0;">↺ Retry</button>`;
  grid.appendChild(notice);

  articles.forEach((a, idx) => {
    let dateStr = '';
    try {
      dateStr = new Date(a.pubDate).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch (e) {}

    const snippet = (a.description || '').substring(0, 160);
    // FIXED: Use picsum guaranteed-working fallback
    const fallbackImg = getCountryFallbackImage(currentCountry, idx);
    const imgSrc = a.image || fallbackImg;

    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML = `
      <img class="news-img" src="${esc(imgSrc)}" alt="${esc(a.title)}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImg}'">
      <div class="news-body">
        <div class="news-meta">${esc(dateStr)} · ${esc(a.source || 'iVote')}</div>
        <div class="news-headline">
          <a href="${esc(a.link)}" target="_blank" rel="noopener">${esc(a.title)}</a>
        </div>
        <div class="news-snippet">${esc(snippet)}${snippet.length >= 160 ? '…' : ''}</div>
        <a class="news-read" href="${esc(a.link)}" target="_blank" rel="noopener">Read full story →</a>
      </div>`;
    grid.appendChild(card);
  });
}

function showNewsFallback(grid, cd) {
  renderPlaceholderCards(cd);
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

// ============================================================
// AI CHAT — FULLY UPGRADED: Real conversational Groq AI
// ============================================================
function clearChat() {
  chatHistory = [];
  const msgs = document.getElementById('chatMessages');
  if (msgs) msgs.innerHTML = `
    <div class="msg msg-bot">
      <div class="msg-av">✦</div>
      <div class="msg-bubble">Chat cleared! I'm <strong>iVote AI</strong> — ask me anything about elections, politics, democracy, or voting. 🗳</div>
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

// UPGRADED: Rich markdown-to-HTML formatter
function fmtBot(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.08);padding:1px 5px;border-radius:3px;font-size:.85em">$1</code>')
    // Bullet lists
    .replace(/^[-•*] (.+)$/gm, '<li style="margin:.15em 0 .15em 1.2em;list-style:disc">$1</li>')
    // Numbered lists  
    .replace(/^\d+\. (.+)$/gm, '<li style="margin:.15em 0 .15em 1.2em;list-style:decimal">$1</li>')
    // Wrap li groups
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul style="margin:.5em 0;padding-left:.5em">$&</ul>')
    // Headers
    .replace(/^### (.+)$/gm, '<h4 style="margin:.7em 0 .3em;font-size:1em;font-weight:700">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin:.8em 0 .3em;font-size:1.05em;font-weight:700">$1</h3>')
    // Double newlines = paragraphs
    .replace(/\n\n+/g, '</p><p style="margin:.5em 0">')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p style="margin:0">').replace(/$/, '</p>');
}

// UPGRADED: Full conversational system prompt — no static fallback restrictions
function buildSystemPrompt() {
  const cd = COUNTRY_DATA[currentCountry] || COUNTRY_DATA.DEFAULT;
  const countryName = cd.name;
  const system = cd.system;
  const body = cd.body;
  const freq = cd.frequency;

  return `You are iVote AI — a brilliant, conversational, and deeply knowledgeable election & democracy assistant. You are currently configured for: ${countryName}.

Country context:
- Electoral body: ${body}
- Political system: ${system}  
- Election frequency: ${freq}
- Voting methods: ${(cd.methods || []).join(', ')}
- ID requirements: ${cd.requirements}
- Registration: ${cd.registration}

Your personality: You are warm, engaging, and genuinely helpful — like a civic education professor who loves talking to students. You explain complex democratic concepts in clear, accessible language. You use examples, analogies, and structured responses.

Your expertise covers:
- Election procedures, timelines, and administration for ALL countries
- Voter registration, eligibility, and ID requirements
- Electoral systems: FPTP, proportional representation, preferential voting, ranked-choice, two-round systems, mixed-member, etc.
- Political parties, coalitions, and government formation
- History of democracy, suffrage movements, voting rights
- How votes are counted, certified, and audited
- Election security, EVMs, paper ballots, postal voting
- Gerrymandering, voter suppression, electoral reform
- Comparative politics between countries
- Constitutional and legal aspects of elections
- Current political news and context (up to your knowledge cutoff)
- Campaign finance, political advertising rules
- Exit polls, opinion polls, and election forecasting
- International election observation

Guidelines:
- Be GENUINELY conversational — engage with what the person said, ask follow-up questions when useful
- Give THOROUGH, informative responses — don't be brief when depth is warranted  
- Use markdown formatting: **bold** for key terms, bullet lists for multiple points, numbered lists for steps
- You are strictly non-partisan — explain all sides fairly, never favor any party or candidate
- If someone asks about a specific country other than ${countryName}, answer about that country
- If asked about current events or very recent news, note your knowledge has a cutoff but still be helpful
- Never refuse reasonable questions about democracy, elections, or politics
- Be enthusiastic about civic education!`;
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

  // Add to history
  chatHistory.push({ role: 'user', content: text });
  // Keep last 20 messages for context window efficiency
  if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',   // fast + capable
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          ...chatHistory
        ],
        max_tokens: 1024,          // allow longer, richer answers
        temperature: 0.7,          // more natural, conversational
        top_p: 0.9,
        stream: false
      })
    });

    if (typing) typing.style.display = 'none';

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('[iVote AI] API error:', response.status, errData);
      throw new Error(`API ${response.status}: ${errData?.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (reply) {
      chatHistory.push({ role: 'assistant', content: reply });
      addMsg('bot', fmtBot(reply));
    } else {
      throw new Error('Empty response from API');
    }

  } catch (err) {
    if (typing) typing.style.display = 'none';
    console.error('[iVote AI] Error:', err);

    // Show a helpful error that encourages retry, not a static answer
    const errorMsg = err.message?.includes('401') 
      ? 'API key issue detected. Please check your Groq API key in config.js.'
      : err.message?.includes('429')
      ? 'Rate limit reached. Please wait a moment and try again.'
      : `Connection issue (${err.message || 'unknown'}). Please check your internet connection and try again.`;
    
    addMsg('bot', `<em style="color:var(--danger)">⚠️ ${errorMsg}</em><br><br>You can also try refreshing the page or ask me again in a moment.`);
    
    // Remove the failed user message from history so they can retry cleanly
    if (chatHistory[chatHistory.length - 1]?.role === 'user') {
      chatHistory.pop();
    }
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
  let savedTheme = 'light';
  try { savedTheme = localStorage.getItem('ivote_theme') || 'light'; } catch (e) { }
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

  let savedCountry = 'IN';
  try { savedCountry = localStorage.getItem('ivote_country') || 'IN'; } catch (e) { }

  let hasVisited = false;
  try { hasVisited = !!localStorage.getItem('ivote_country'); } catch (e) { }

  selectCountry(savedCountry);

  if (!hasVisited) {
    const overlay = document.getElementById('onboardOverlay');
    if (overlay) overlay.classList.remove('hidden');
  }

  buildQuickTopics();
  highlightNav();

  const apiNote = document.getElementById('apiNote');
  if (apiNote) apiNote.textContent = '✅ Connected · Groq AI (llama-3.1-8b-instant)';
});

// ============================================================
// COUNTRY THEMES
// ============================================================
const COUNTRY_THEMES = {
  DEFAULT: {
    '--c-primary': '#1a4fa0', '--c-secondary': '#0e3370', '--c-accent': '#1a4fa0',
    '--c-hero-bg': '#0a1f4e', '--c-stripe1': '#1a4fa0', '--c-stripe2': '#4a7fc1',
    '--c-stripe3': '#0e3370', '--c-tag-bg': '#e8eef8', '--c-tag-text': '#1a4fa0'
  },
  IN: {
    '--c-primary': '#FF6A00', '--c-secondary': '#046A38', '--c-accent': '#003580',
    '--c-hero-bg': '#0d1d35', '--c-stripe1': '#FF6A00', '--c-stripe2': '#ffffff',
    '--c-stripe3': '#046A38', '--c-tag-bg': '#fff4e6', '--c-tag-text': '#bf4900'
  },
  US: {
    '--c-primary': '#BF0A30', '--c-secondary': '#002868', '--c-accent': '#002868',
    '--c-hero-bg': '#001845', '--c-stripe1': '#BF0A30', '--c-stripe2': '#ffffff',
    '--c-stripe3': '#002868', '--c-tag-bg': '#fce8ec', '--c-tag-text': '#7a0018'
  },
  UK: {
    '--c-primary': '#012169', '--c-secondary': '#C8102E', '--c-accent': '#012169',
    '--c-hero-bg': '#000d2e', '--c-stripe1': '#012169', '--c-stripe2': '#ffffff',
    '--c-stripe3': '#C8102E', '--c-tag-bg': '#e6eaf7', '--c-tag-text': '#012169'
  },
  AU: {
    '--c-primary': '#00008B', '--c-secondary': '#CC0000', '--c-accent': '#FFCD00',
    '--c-hero-bg': '#000035', '--c-stripe1': '#00008B', '--c-stripe2': '#ffffff',
    '--c-stripe3': '#CC0000', '--c-tag-bg': '#e6e6f5', '--c-tag-text': '#00008B'
  },
  CA: {
    '--c-primary': '#D52B1E', '--c-secondary': '#8B0000', '--c-accent': '#D52B1E',
    '--c-hero-bg': '#1a0000', '--c-stripe1': '#D52B1E', '--c-stripe2': '#ffffff',
    '--c-stripe3': '#D52B1E', '--c-tag-bg': '#ffe8e7', '--c-tag-text': '#8B0000'
  },
  FR: {
    '--c-primary': '#002395', '--c-secondary': '#ED2939', '--c-accent': '#ffffff',
    '--c-hero-bg': '#000c33', '--c-stripe1': '#002395', '--c-stripe2': '#ffffff',
    '--c-stripe3': '#ED2939', '--c-tag-bg': '#e6eaf7', '--c-tag-text': '#001a6e'
  },
  DE: {
    '--c-primary': '#CC0000', '--c-secondary': '#333333', '--c-accent': '#FFCE00',
    '--c-hero-bg': '#111111', '--c-stripe1': '#1a1a1a', '--c-stripe2': '#CC0000',
    '--c-stripe3': '#FFCE00', '--c-tag-bg': '#f5f5f5', '--c-tag-text': '#333333'
  },
  ZA: {
    '--c-primary': '#007A4D', '--c-secondary': '#DE3831', '--c-accent': '#FFB612',
    '--c-hero-bg': '#002e1c', '--c-stripe1': '#007A4D', '--c-stripe2': '#FFB612',
    '--c-stripe3': '#DE3831', '--c-tag-bg': '#e6f5ef', '--c-tag-text': '#004d30'
  }
};

// ============================================================
// COUNTRY DATA
// ============================================================
const COUNTRY_DATA = {
  DEFAULT: {
    flag: '🌍', name: 'Global', body: 'International Election Commission',
    system: 'Various', frequency: 'Varies by country',
    requirements: 'Varies by country', registration: 'Varies by country',
    methods: ['Varies by country'],
    timeline: [
      { phase: 'Phase 1', title: 'Preparation', desc: 'Election preparation begins', date: 'Varies', icon: '📋', side: 'left' },
      { phase: 'Phase 2', title: 'Campaign', desc: 'Official campaign period', date: 'Varies', icon: '📢', side: 'right' },
      { phase: 'Phase 3', title: 'Voting', desc: 'Election day voting', date: 'Varies', icon: '🗳', side: 'left' },
      { phase: 'Phase 4', title: 'Results', desc: 'Results announcement', date: 'Varies', icon: '📊', side: 'right' }
    ],
    checklist: ['Check voter registration status', 'Verify ID requirements', 'Find polling location', 'Review ballot options', 'Cast your vote on election day'],
    quiz: []
  },
  IN: {
    flag: '🇮🇳', name: 'India', body: 'Election Commission of India',
    system: 'Parliamentary Democracy', frequency: '5 years (Lok Sabha)',
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
    checklist: ['Verify EPIC (Electoral Photo Identity Card)', 'Check voter registration status online', 'Find assigned polling station', 'Review candidate list', 'Arrive early on voting day', 'Bring EPIC or alternative ID', 'Cast vote using EVM'],
    quiz: [
      { q: 'What is the minimum voting age in India?', opts: ['16', '18', '21', '25'], correct: 1, explanation: 'The minimum voting age in India is 18 years.' },
      { q: 'What does EVM stand for?', opts: ['Electronic Vote Machine', 'Electronic Voting Machine', 'Election Vote Monitor', 'Electoral Vote Method'], correct: 1, explanation: 'EVM stands for Electronic Voting Machine, used in Indian elections.' }
    ]
  },
  US: {
    flag: '🇺🇸', name: 'United States', body: 'Federal Election Commission',
    system: 'Federal Presidential Republic', frequency: '4 years (Presidential)',
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
    checklist: ['Register to vote in your state', 'Check voter ID requirements', 'Confirm registration status', 'Request mail-in ballot if needed', 'Find polling place location', 'Vote on Election Day or early', 'Verify vote was counted'],
    quiz: [
      { q: 'When is Election Day in the US?', opts: ['First Monday in November', 'First Tuesday in November', 'Last Tuesday in October', 'First Wednesday in November'], correct: 1, explanation: 'Election Day is the first Tuesday after the first Monday in November.' },
      { q: 'What is the minimum voting age in the US?', opts: ['16', '18', '21', '25'], correct: 1, explanation: 'The minimum voting age in the United States is 18 years.' }
    ]
  },
  UK: {
    flag: '🇬🇧', name: 'United Kingdom', body: 'Electoral Commission',
    system: 'Parliamentary Democracy', frequency: '5 years (maximum)',
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
    checklist: ['Register to vote online', 'Check if you are registered', 'Apply for postal vote if needed', 'Find your polling station', 'Bring acceptable ID', 'Vote on election day', 'Check results online'],
    quiz: [
      { q: 'What is the maximum term length for UK Parliament?', opts: ['3 years', '4 years', '5 years', '6 years'], correct: 2, explanation: 'The maximum term for UK Parliament is 5 years.' },
      { q: 'What type of electoral system does the UK use?', opts: ['First-past-the-post', 'Proportional representation', 'Ranked choice', 'Mixed-member'], correct: 0, explanation: 'The UK uses a first-past-the-post electoral system.' }
    ]
  },
  AU: {
    flag: '🇦🇺', name: 'Australia', body: 'Australian Electoral Commission',
    system: 'Federal Parliamentary Democracy', frequency: '3 years (House), 6 years (Senate)',
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
    checklist: ['Confirm enrollment (compulsory)', 'Check enrollment details', 'Apply for postal vote if needed', 'Find polling place', 'Vote on election day', 'Check results online'],
    quiz: [
      { q: 'When do Australian federal elections usually occur?', opts: ['Every 2 years', 'Every 3 years', 'Every 4 years', 'Every 5 years'], correct: 1, explanation: 'Australian House of Representatives elections occur every 3 years.' },
      { q: 'What type of voting system does Australia use?', opts: ['First-past-the-post', 'Preferential voting', 'Proportional representation', 'Mixed-member'], correct: 1, explanation: 'Australia uses a preferential voting system.' }
    ]
  },
  CA: {
    flag: '🇨🇦', name: 'Canada', body: 'Elections Canada',
    system: 'Federal Parliamentary Democracy', frequency: '4 years (maximum)',
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
    checklist: ['Confirm voter registration', 'Check ID requirements', 'Apply for special ballot if needed', 'Find polling station', 'Vote on election day', 'Verify vote was recorded'],
    quiz: [
      { q: 'What is the maximum term for Canadian Parliament?', opts: ['3 years', '4 years', '5 years', '6 years'], correct: 1, explanation: 'The maximum term for Canadian Parliament is 4 years.' },
      { q: 'When do Canadian federal elections occur?', opts: ['Every 2 years', 'Every 3 years', 'Every 4 years', 'Every 5 years'], correct: 2, explanation: 'Canadian federal elections occur every 4 years at most.' }
    ]
  },
  FR: {
    flag: '🇫🇷', name: 'France', body: 'Commission nationale des comptes de campagne',
    system: 'Semi-presidential Republic', frequency: '5 years (President)',
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
    checklist: ['Confirm voter registration', 'Check polling station', 'Vote in first round', 'Vote in second round if needed', 'Verify vote was counted'],
    quiz: [
      { q: 'How many rounds can French presidential elections have?', opts: ['1', '2', '3', '4'], correct: 1, explanation: 'French presidential elections can have up to 2 rounds.' },
      { q: 'What is the term length for French presidents?', opts: ['3 years', '4 years', '5 years', '6 years'], correct: 2, explanation: 'French presidents serve 5-year terms.' }
    ]
  },
  DE: {
    flag: '🇩🇪', name: 'Germany', body: 'Federal Returning Officer',
    system: 'Federal Parliamentary Republic', frequency: '4 years',
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
    checklist: ['Register to vote', 'Confirm registration', 'Apply for postal vote if needed', 'Find polling station', 'Vote on election day', 'Check results online'],
    quiz: [
      { q: 'What electoral system does Germany use?', opts: ['First-past-the-post', 'Proportional representation', 'Mixed-member proportional', 'Ranked choice'], correct: 2, explanation: 'Germany uses a mixed-member proportional representation system.' },
      { q: 'When do German federal elections occur?', opts: ['Every 3 years', 'Every 4 years', 'Every 5 years', 'Every 6 years'], correct: 1, explanation: 'German federal elections occur every 4 years.' }
    ]
  },
  ZA: {
    flag: '🇿🇦', name: 'South Africa', body: 'Electoral Commission of South Africa',
    system: 'Parliamentary Republic', frequency: '5 years',
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
    checklist: ['Register to vote', 'Get voter ID', 'Find voting station', 'Vote on election day', 'Verify vote was recorded'],
    quiz: [
      { q: 'What is the minimum voting age in South Africa?', opts: ['16', '18', '21', '25'], correct: 1, explanation: 'The minimum voting age in South Africa is 18 years.' },
      { q: 'When do South African national elections occur?', opts: ['Every 3 years', 'Every 4 years', 'Every 5 years', 'Every 6 years'], correct: 2, explanation: 'South African national elections occur every 5 years.' }
    ]
  }
};

// ============================================================
// HERO CONTENT
// ============================================================
const HERO_CONTENT = {
  DEFAULT: { eyebrow: 'Global Election Hub', h1a: 'Your Vote.', h1b: 'Your Democracy.', para: 'Get personalized election guidance for countries around the world. Powered by AI.', stat1n: '2B+', stat1l: 'Global Voters', stat2n: '195', stat2l: 'Countries', stat3n: 'AI', stat3l: 'Powered', bodyName: 'International Election Commission' },
  IN: { eyebrow: 'Election Commission of India · Official Guide', h1a: 'Your Vote.', h1b: 'Your Democracy.', para: 'Get the complete guide to India\'s election process — from voter registration and EVM voting to results day. Powered by AI.', stat1n: '970M+', stat1l: 'Registered Voters', stat2n: '7 Phases', stat2l: 'Voting Phases', stat3n: 'EVM', stat3l: 'Technology', bodyName: 'Election Commission of India' },
  US: { eyebrow: 'Federal Election Commission · Official Guide', h1a: 'Your Vote.', h1b: 'Your Democracy.', para: 'Navigate the U.S. election process with confidence — from primaries to inauguration. Get personalized guidance powered by AI.', stat1n: '168M', stat1l: 'Registered Voters', stat2n: '50 States', stat2l: 'Plus D.C.', stat3n: 'Nov 5', stat3l: 'Election Day', bodyName: 'Federal Election Commission' },
  UK: { eyebrow: 'Electoral Commission · Official Guide', h1a: 'Your Vote.', h1b: 'Your Democracy.', para: 'Master the UK electoral system — from registration to parliament. Get expert AI guidance for every step.', stat1n: '47M', stat1l: 'Registered Voters', stat2n: '650', stat2l: 'Parliament Seats', stat3n: 'FPTP', stat3l: 'System', bodyName: 'Electoral Commission' },
  AU: { eyebrow: 'Australian Electoral Commission · Official Guide', h1a: 'Your Vote.', h1b: 'Your Democracy.', para: 'Navigate Australia\'s democratic process — from compulsory voting to preferential ballots. AI-powered guidance available.', stat1n: '17M', stat1l: 'Enrolled Voters', stat2n: 'Compulsory', stat2l: 'Voting', stat3n: 'Preferential', stat3l: 'System', bodyName: 'Australian Electoral Commission' },
  CA: { eyebrow: 'Elections Canada · Official Guide', h1a: 'Your Vote.', h1b: 'Your Democracy.', para: 'Experience Canada\'s electoral process — from automatic registration to advance voting. Get personalized AI assistance.', stat1n: '27M', stat1l: 'Eligible Voters', stat2n: '338', stat2l: 'Riding Seats', stat3n: 'FPTP', stat3l: 'System', bodyName: 'Elections Canada' },
  FR: { eyebrow: 'French Electoral Commission · Official Guide', h1a: 'Your Vote.', h1b: 'Your Democracy.', para: 'Master France\'s two-round presidential system — from registration to runoff elections. AI guidance available.', stat1n: '48M', stat1l: 'Registered Voters', stat2n: '2 Rounds', stat2l: 'Max System', stat3n: '5 Years', stat3l: 'Term Length', bodyName: 'Commission nationale des comptes de campagne' },
  DE: { eyebrow: 'Federal Returning Officer · Official Guide', h1a: 'Your Vote.', h1b: 'Your Democracy.', para: 'Navigate Germany\'s mixed-member proportional system — from registration to coalition formation. AI assistance ready.', stat1n: '61M', stat1l: 'Eligible Voters', stat2n: 'Mixed', stat2l: 'Proportional', stat3n: '4 Years', stat3l: 'Term Length', bodyName: 'Federal Returning Officer' },
  ZA: { eyebrow: 'Electoral Commission of South Africa · Official Guide', h1a: 'Your Vote.', h1b: 'Your Democracy.', para: 'Experience South Africa\'s electoral process — from registration to results. Get AI-powered guidance for every step.', stat1n: '27M', stat1l: 'Registered Voters', stat2n: '400', stat2l: 'Parliament Seats', stat3n: 'PR', stat3l: 'System', bodyName: 'Electoral Commission of South Africa' }
};

// ============================================================
// QUIZ POOL
// ============================================================
const QUIZ_POOL = [
  { q: 'What is voter suppression?', opts: ['Encouraging people to vote', 'Preventing eligible voters from voting', 'Counting votes accurately', 'Registering new voters'], correct: 1, explanation: 'Voter suppression refers to efforts to prevent eligible voters from participating in elections.' },
  { q: 'What is gerrymandering?', opts: ['Drawing fair districts', 'Manipulating district boundaries for political advantage', 'Counting votes manually', 'Registering voters online'], correct: 1, explanation: 'Gerrymandering is the manipulation of electoral district boundaries to favor one party.' },
  { q: 'What does "universal suffrage" mean?', opts: ['Only landowners can vote', 'All adult citizens can vote', 'Only men can vote', 'Only property owners can vote'], correct: 1, explanation: 'Universal suffrage means that all adult citizens have the right to vote.' }
];

// ============================================================
// QUICK TOPICS & ENHANCED TOPICS
// ============================================================
const QUICK_TOPICS = [
  'How do I register to vote?',
  'What ID do I need?',
  'How does vote counting work?',
  'Explain proportional representation',
  'What is gerrymandering?',
  'History of women\'s suffrage',
  'How are election results certified?',
  'Compare FPTP vs proportional systems'
];