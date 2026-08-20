"use strict";

const https = require("https");

function fetchJson(url, timeoutMs = 3500) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { "User-Agent": "Primer/1.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(null);
    });
  });
}

class RetrievalTool {
  needed(decision, understanding) {
    return (decision?.tools || []).includes("retrieval") || understanding?.intent === "fact";
  }

  async retrieve(query) {
    const q = String(query || "").trim();
    if (!q) return "";
    const encoded = encodeURIComponent(q.slice(0, 120));
    try {
      const wiki = await fetchJson(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&utf8=&format=json`);
      const hits = wiki?.query?.search || [];
      return hits.slice(0, 2).map((item) => {
        const snippet = String(item.snippet || "")
          .replace(/<[^>]+>/g, "")
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&amp;/g, "&");
        return `${item.title}: ${snippet}`;
      }).join("\n");
    } catch {
      return "";
    }
  }
}

module.exports = RetrievalTool;
