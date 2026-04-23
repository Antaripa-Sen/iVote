// ============================================================
// Configuration Loader - Loads API keys from environment
// ============================================================

// Load environment variables (works with Vite, webpack, or similar)
// For local development without a build tool, it loads from localStorage or uses fallback

let CONFIG = {
  NEWS_API_KEY: '',
  GROQ_API_KEY: ''
};

// Try to load from environment (works with build tools)
if (typeof import.meta !== 'undefined' && import.meta.env) {
  CONFIG.NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY || '';
  CONFIG.GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
}

// Fallback: Check localStorage (user can set these manually)
if (!CONFIG.NEWS_API_KEY) {
  CONFIG.NEWS_API_KEY = localStorage.getItem('ivote_news_key') || '';
}
if (!CONFIG.GROQ_API_KEY) {
  CONFIG.GROQ_API_KEY = localStorage.getItem('ivote_groq_key') || '';
}

// Export for use in other modules
window.CONFIG = CONFIG;
