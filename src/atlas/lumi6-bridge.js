"use strict";

const DRAW = require("../../public/draw.js");
const { extractSpoken } = require("../primer/tutor/proposal.js");

/**
 * Shared blocklist of question patterns that are NEVER worth drawing.
 * Must stay in sync with visual-planner.js.
 */
const NO_DRAW_PATTERNS = [
  /what is the capital/i,
  /capital of/i,
  /who is\b/i,
  /who was\b/i,
  /when (was|did|is|did)\b/i,
  /where is\b/i,
  /how many\b/i,
  /what year\b/i,
  /how old\b/i,
  /what language\b/i,
  /who (invented|discovered|founded)\b/i,
  /what does .+ mean/i,
  /definition of\b/i,
  /meaning of\b/i,
  /translate\b/i,
  /which is the (highest|longest|largest|smallest|biggest|deepest|fastest|slowest)/i,
  /which (is|was|are|were)\b/i,
  /highest mountain in/i,
  /longest river in/i,
  /largest ocean/i,
];

/**
 * Precise topic → description mapping.
 * Maps student question / AI response keywords to specific template keys.
 */
function resolveDescription(studentInput, teacherResponse) {
  const combined = `${studentInput} ${teacherResponse}`.toLowerCase();
  const q = studentInput.toLowerCase();

  // Equations / math solving
  const equationMatch = studentInput.match(/(\d*\s*x\s*[+\-]\s*\d+\s*=\s*\d+|\d+x\s*=\s*\d+)/i);
  if (equationMatch || /solve|equation|find x|find y|algebra/i.test(q)) {
    // Extract the equation from the student's question if possible
    const eqText = studentInput.replace(/solve\s*(for)?\s*/i, "").replace(/\.$/, "").trim();
    return { type: "formula", description: `solve_equation:${eqText}` };
  }

  // Data structures
  if (combined.includes("binary search")) return { type: "diagram", description: "binary search" };
  if (/bubble sort/i.test(combined)) return { type: "diagram", description: "bubble sort" };
  if (/merge sort/i.test(combined)) return { type: "diagram", description: "merge sort" };
  if (/linked list/i.test(combined)) return { type: "diagram", description: "linked list" };
  if (/\bstack\b/i.test(combined) && !/stack overflow/i.test(combined)) return { type: "diagram", description: "stack" };
  if (/\bqueue\b/i.test(combined)) return { type: "diagram", description: "queue" };
  if (/binary tree|bst|search tree/i.test(combined)) return { type: "diagram", description: "binary tree" };
  if (/\btree\b/i.test(combined)) return { type: "diagram", description: "binary tree" };

  // Science
  if (/water cycle|hydrologic/i.test(combined)) return { type: "diagram", description: "water cycle" };
  if (/photosynthesis/i.test(combined)) return { type: "diagram", description: "photosynthesis" };
  if (/mountain|everest/i.test(combined)) return { type: "diagram", description: "mountain" };

  // Math formulas
  if (/formula|equation|latex/i.test(combined)) return { type: "formula", description: "formula" };

  return { type: "diagram", description: `generic:${studentInput.slice(0, 80)}` };
}

function parseIllustrationJson(raw) {
  const text = String(raw || "").replace(/^\uFEFF/, "").trim()
    .replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.svg === "string") return parsed;
  } catch {}
  const svgMatch = text.match(/<svg[\s\S]*<\/svg>/i);
  if (svgMatch) return { title: "", svg: svgMatch[0] };
  return null;
}

function wrapGeneratedSvg(title, svg) {
  const cleaned = String(svg || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
    .trim();
  if (!/<svg[\s\S]*<\/svg>/i.test(cleaned)) return null;
  const safeTitle = String(title || "Illustration").replace(/[<>]/g, "").slice(0, 80);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:transparent; font-family:Inter, sans-serif; }
    .container { display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%; padding:8px; box-sizing:border-box; }
    svg { width:100%; height:100%; max-width:100%; max-height:100%; }
  </style>
</head>
<body>
  <div class="container">${cleaned}</div>
</body>
</html>`;
}

/**
 * RealLumi6AiProvider
 *
 * Bridges ATLAS with Lumi6's live AI provider.
 */
const https = require("https");

function fetchJson(url, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      }
    );
    req.on("error", () => resolve(null));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function searchWeb(query) {
  if (!query || typeof query !== "string") return null;
  const q = query.trim();
  const encoded = encodeURIComponent(q);

  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&utf8=&format=json`;
    const ddgUrl = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`;

    const [wiki, ddg] = await Promise.all([fetchJson(wikiUrl), fetchJson(ddgUrl)]);

    const snippets = [];
    if (ddg?.AbstractText) {
      snippets.push(ddg.AbstractText);
    }
    if (Array.isArray(ddg?.RelatedTopics)) {
      for (const t of ddg.RelatedTopics) {
        if (t.Text && snippets.length < 3) {
          snippets.push(t.Text);
        }
      }
    }
    if (wiki?.query?.search?.length) {
      for (const item of wiki.query.search.slice(0, 3)) {
        const cleanSnippet = item.snippet
          .replace(/<[^>]+>/g, "")
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&amp;/g, "&")
          .trim();
        if (cleanSnippet) {
          snippets.push(`${item.title}: ${cleanSnippet}`);
        }
      }
    }

    return snippets.length ? snippets.join("\n\n") : null;
  } catch (err) {
    return null;
  }
}

function stripStageDirections(raw) {
  let text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const junk = /whiteboard (is blank|shows|says|has)|the board (shows|says|has)|there is no (new )?(sketch|handwriting|drawing)|no new sketch|no handwriting visible|sketch is blank|board is empty|i (can|cannot|can't|don't) see (any )?(new )?(sketch|handwriting|drawing|marks)?|photo of the whiteboard|i('m| am) pointing to|labeled ['"]how clouds form['"] picture|board par|halki grid/i;
  text = text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.trim() && !junk.test(sentence))
    .join(" ")
    .replace(/^sorry[,.]?\s*/i, "")
    .trim();
  return text;
}

/**
 * RealLumi6AiProvider
 *
 * Bridges ATLAS with Lumi6's live AI provider.
 */
class RealLumi6AiProvider {
  constructor(options = {}) {
    this.callModelFn = options.callModelFn || null;
    this.providerName = options.providerName || process.env.AI_PROVIDER || "api";
    this.modelName = options.modelName || process.env.MODEL || "configured-default";
  }

  async generateTeacherResponse(history) {
    const studentQuery = history[history.length - 1]?.content || "";

    const ATLAS_TEACHER_SYSTEM_PROMPT =
      "You are Lumi6, a personal whiteboard tutor. A picture may already be on the board.\n" +
      "Talk like a patient mentor: explain the idea, point at the picture, make the student think, then ask ONE good question.\n" +
      "If they are stuck, offer a hint or a second way to see it. Do not lecture forever. Do not repeat yourself.\n" +
      "Never say 'you're getting it' or 'what should we explore next'. Never use ASCII art.\n" +
      "Reply with 4 to 8 short spoken sentences. Plain speech only — no JSON, no markdown.";

    let webContext = "";
    if (/latest|news|current|who won|today|recent|search|find|who invented|capital of|highest|mountain|peak|which is|where is/i.test(studentQuery)) {
      try {
        const searchResults = await searchWeb(studentQuery);
        if (searchResults) {
          webContext = `\n\n[Web Search Retrieval Context]:\n${searchResults}`;
        }
      } catch (err) {}
    }

    const promptInput = {
      persona: "teacher",
      userAction: "explain",
      systemPrompt: ATLAS_TEACHER_SYSTEM_PROMPT,
      studentQuery: studentQuery,
      typedInput: `${ATLAS_TEACHER_SYSTEM_PROMPT}${webContext}\n\nStudent Question: "${studentQuery}"`,
      conversationHistory: history.slice(-6)
    };

    console.log("==================================================");
    console.log("[ATLAS AI Audit 1] AI Provider Invoked:", this.callModelFn ? "YES (Live Call)" : "NO (Fallback)");
    console.log("[ATLAS AI Audit 2] Provider:", this.providerName, "| Model:", this.modelName);
    console.log("[ATLAS AI Audit 3] Exact Prompt Sent:", JSON.stringify(promptInput, null, 2));

    if (typeof this.callModelFn === "function") {
      try {
        const response = await this.callModelFn(promptInput);
        console.log("[ATLAS AI Audit 4] Response Type: REAL_LLM");
        console.log("[ATLAS AI Audit 5] Raw AI Response:", JSON.stringify(response, null, 2));

        let text = "";
        if (typeof response?.content === "string" && response.content.trim()) {
          text = response.content.trim();
        } else if (response?.result?.message && typeof response.result.message === "string") {
          text = response.result.message.trim();
        } else if (response?.result?.commands && Array.isArray(response.result.commands)) {
          const textCmd = response.result.commands.find((c) => c.tool === "write_text");
          if (textCmd?.text) text = textCmd.text.trim();
        } else if (typeof response === "string" && response.trim()) {
          text = response.trim();
        }

        if (text && typeof text === "string" && text.trim()) {
          return text.trim();
        }
      } catch (err) {
        console.warn("[ATLAS AI Audit 4] Live AI call failed. Falling back.", err.message);
      }
    }

    console.log("[ATLAS AI Audit 4] Response Type: FALLBACK_TEMPLATE");
    const fallbackText = await this._generateDefaultExplanation(studentQuery);
    console.log("[ATLAS AI Audit 5] Raw AI Response (Fallback):", fallbackText);
    return fallbackText;
  }

  async generateTutorTurn({ studentInput, history, boardImage, hasPicture, topicTitle }) {
    const recent = (Array.isArray(history) ? history : []).slice(-10)
      .map((turn) => {
        const content = stripStageDirections(turn.content || "");
        if (!content) return "";
        return `${turn.role === "student" ? "Student" : "Tutor"}: ${content}`;
      })
      .filter(Boolean)
      .join("\n");

    const boardNote = boardImage
      ? "A photo is attached only because the student is asking about something THEY wrote or marked. Ignore printed blue notes the tutor already added. Look only for fresh handwriting or a circled problem. Answer their question. Never say 'the whiteboard shows' or describe the photo."
      : "No board photo is attached. Answer what the student just said. Do not mention the whiteboard.";

    const systemPrompt =
`You are a patient older sibling teaching a kid (about 8 to 14) at a whiteboard.
Invent a simple explanation for THIS question. Do not use a stock lecture.

${boardNote}

HOW TO TALK:
- Short words. Short sentences. One idea this turn.
- Use an everyday picture: balls, buses, cookies, running, clocks — whatever fits THIS idea.
- If you use a hard word, say what it means right after.
- 2-4 spoken sentences. Then ONE easy check question they can answer out loud.
- Return PLAIN SPEECH only. Never JSON. Never keys like spoken or check.
- Never markdown. Never bullet lists. Never a canned relativity / water-cycle / gravity script.
- Never "here's a situation where", "the everyday assumption", "great question", "you're getting it".
- Never copy their own words onto the board.

If they asked how/why: give the reason with a real-life example, then a check question.
If they answered your last question: say right / almost / not yet in one kid sentence, then the next small question.`;

    const promptInput = {
      persona: "teacher",
      userAction: "explain",
      systemPrompt,
      studentQuery: studentInput,
      typedInput: `${systemPrompt}\n\nRecent conversation:\n${recent || "(first turn)"}\n\nStudent just said: "${studentInput}"`,
      conversationHistory: (history || []).slice(-10),
      boardImage: boardImage || null
    };
    if (typeof this.callModelFn !== "function") return "";
    const response = await this.callModelFn(promptInput);
    let text = "";
    if (typeof response?.content === "string") text = response.content;
    else if (typeof response?.result?.message === "string") text = response.result.message;
    else if (typeof response === "string") text = response;
    return stripStageDirections(extractSpoken(text));
  }

  async generateVisualPlan(studentInput, spokenResponse) {
    if (typeof this.callModelFn !== "function") return null;
    const prompt = `Given a student question and a tutor's spoken explanation, create a simple visual diagram title and 3-4 key steps/labels for a whiteboard drawing.

Student asked: "${studentInput}"
Tutor explained: "${spokenResponse}"

Respond in this exact JSON format only:
{"title":"Short Title","steps":["1. Label\\nDetail","2. Label\\nDetail","3. Label\\nDetail","4. Label\\nDetail"]}`;

    try {
      const response = await this.callModelFn({
        persona: "assistant",
        userAction: "structure",
        systemPrompt: "You output only valid JSON. No markdown, no explanation.",
        studentQuery: prompt,
        typedInput: prompt
      });
      let text = "";
      if (typeof response?.content === "string") text = response.content;
      else if (typeof response?.result?.message === "string") text = response.result.message;
      else if (typeof response === "string") text = response;
      text = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(text);
      if (parsed?.title && Array.isArray(parsed.steps)) return parsed;
    } catch (e) {
      console.warn("[ATLAS] Visual plan parse failed:", e.message);
    }
    return null;
  }

  /**
   * Prefer a picture for teaching. Only skip drawing for short factual Q&A.
   */
  async planVisual(teacherResponse, studentInput) {
    const input = String(studentInput || "").trim();
    const lowerInput = input.toLowerCase()
      .replace(/\bhuman autonomy\b/g, "human anatomy")
      .replace(/\bautonomy\b/g, "anatomy");

    if (NO_DRAW_PATTERNS.some((p) => p.test(input))) {
      console.log("[ATLAS AI Audit 6] VisualPlanner Source: BLOCKED (factual question — no drawing needed)");
      return { shouldDraw: false, type: "none", description: "" };
    }

    const visualCue = /\b(draw|sketch|show|diagram|visualize|illustrate|chart|flowchart|anatomy|body|organ|cycle|how does|explain|teach|picture|graphic)\b/i;
    const isVisualLesson = visualCue.test(lowerInput) || lowerInput.length > 12;

    if (!isVisualLesson) {
      console.log("[ATLAS AI Audit 6] VisualPlanner Source: CONVERSATIONAL (no visual lesson)");
      return { shouldDraw: false, type: "none", description: "" };
    }

    let description = lowerInput
      .replace(/^.*?\b(draw|sketch|diagram|visualize|illustrate|chart|flowchart|show( me)?( a)?( diagram of)?|put a diagram of|explain|teach( me)?( about)?)\b\s*(a|an|the)?\s*/i, "")
      .replace(/on (the )?canvas.*$/i, "")
      .replace(/\?+$/, "")
      .trim();

    if (!description) description = "diagram";

    console.log("[ATLAS AI Audit 6] VisualPlanner Source: VISUAL_LESSON | Topic:", description);
    return { shouldDraw: true, type: "diagram", description };
  }

  async generateIllustration(topic) {
    const subject = String(topic || "the concept").trim().slice(0, 120);
    const systemPrompt =
      "You create colorful educational illustrations for children.\n" +
      "Return ONLY raw JSON with two fields: title (short uppercase) and svg (one complete <svg> element).\n" +
      "The SVG must use viewBox=\"0 0 800 560\", bright fills, thick strokes, and large labeled parts.\n" +
      "No scripts, no external URLs, no images, no markdown fences.";
    const promptInput = {
      persona: "teacher",
      userAction: "explain",
      systemPrompt,
      studentQuery: subject,
      typedInput: `${systemPrompt}\n\nDraw a kid-friendly labeled illustration of: "${subject}"`
    };

    if (typeof this.callModelFn !== "function") return null;
    try {
      const response = await this.callModelFn(promptInput);
      const raw = typeof response?.content === "string" ? response.content : "";
      const parsed = parseIllustrationJson(raw);
      if (!parsed?.svg) return null;
      const html = wrapGeneratedSvg(parsed.title || subject, parsed.svg);
      if (!html) return null;
      return {
        tool: "html_widget",
        widgetType: "html_widget",
        pluginId: "general",
        x: 3600,
        y: 6000,
        w: 12800,
        h: 8000,
        title: String(parsed.title || subject).slice(0, 60),
        refreshSeconds: 0,
        html,
        atlasGenerated: true
      };
    } catch (err) {
      console.warn("[ATLAS] Illustration generation failed:", err.message);
      return null;
    }
  }

  async _generateDefaultExplanation(query) {
    const q = String(query || "").toLowerCase().trim();

    // Guard against intent classifier internal prompts
    if (q.includes("classify the following student utterance") || q.includes("intent classification")) {
      return "teaching_request";
    }

    return "The AI request failed. Please try again."
  }
}

/**
 * LiveLumi6WhiteboardClient
 */
class LiveLumi6WhiteboardClient {
  async executeCommands(commands) {
    if (!Array.isArray(commands) || commands.length === 0) {
      return { success: true, commands: [], drawnCount: 0, normalized: [] };
    }

    const normalizedCommands = [];

    for (const cmd of commands) {
      if (!cmd || typeof cmd !== "object") continue;

      if (cmd.tool === "draw") {
        const normalized = DRAW.normalize(cmd);
        if (!normalized) {
          throw new Error(`Command validation failed in Lumi6 DRAW engine for tool 'draw'`);
        }
        normalizedCommands.push(normalized);
      } else if (["write_text", "draw_formula", "plot_function"].includes(cmd.tool)) {
        if (!Number.isFinite(cmd.x) || !Number.isFinite(cmd.y)) {
          throw new Error(`Invalid coordinates for Lumi6 tool '${cmd.tool}'`);
        }
        normalizedCommands.push({ ...cmd });
      } else {
        normalizedCommands.push({ ...cmd });
      }
    }

    return {
      success: true,
      commands,
      drawnCount: normalizedCommands.length,
      normalized: normalizedCommands
    };
  }
}

module.exports = {
  RealLumi6AiProvider,
  LiveLumi6WhiteboardClient
};
