const functions = require("firebase-functions");
const https = require("https");
const http = require("http");

// Fetch a URL server-side (no CORS issues)
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

// Parse RSS XML into simple article objects
function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return m ? (m[1] || m[2] || "").trim() : "";
    };
    items.push({
      title: get("title"),
      link: get("link"),
      pubDate: get("pubDate"),
      source: get("source"),
      description: get("description").replace(/<[^>]*>/g, "").substring(0, 200),
    });
  }
  return items.slice(0, 6);
}

const FEEDS = {
  IN: "https://news.google.com/rss/search?q=India+election+politics&hl=en-IN&gl=IN&ceid=IN:en",
  US: "https://news.google.com/rss/search?q=US+election+politics&hl=en-US&gl=US&ceid=US:en",
  UK: "https://news.google.com/rss/search?q=UK+election+parliament&hl=en-GB&gl=GB&ceid=GB:en",
  AU: "https://news.google.com/rss/search?q=Australia+election+politics&hl=en-AU&gl=AU&ceid=AU:en",
  CA: "https://news.google.com/rss/search?q=Canada+election+politics&hl=en-CA&gl=CA&ceid=CA:en",
  FR: "https://news.google.com/rss/search?q=France+election+vote&hl=fr&gl=FR&ceid=FR:fr",
  DE: "https://news.google.com/rss/search?q=Deutschland+Wahl+Politik&hl=de&gl=DE&ceid=DE:de",
  ZA: "https://news.google.com/rss/search?q=South+Africa+election+politics&hl=en-ZA&gl=ZA&ceid=ZA:en",
};

exports.getNews = functions.https.onRequest((req, res) => {
  // Allow your Firebase Hosting domain (CORS handled here, server-side)
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Cache-Control", "public, max-age=900"); // cache 15 min

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  const country = (req.query.country || "IN").toUpperCase();
  const feedUrl = FEEDS[country] || FEEDS["IN"];

  fetchUrl(feedUrl)
    .then((xml) => {
      const articles = parseRSS(xml);
      res.json({ ok: true, articles });
    })
    .catch((err) => {
      console.error("Feed fetch error:", err);
      res.json({ ok: false, articles: [] });
    });
});