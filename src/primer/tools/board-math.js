"use strict";

function formatNumber(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const roundedInt = Math.round(n);
  if (Math.abs(n - roundedInt) < 1e-9) return roundedInt;
  return Math.round(n * 10000) / 10000;
}

function prettyOp(op) {
  const o = String(op || "").trim();
  if (o === "*" || /^x$/i.test(o) || o === "times" || o === "multiplied by") return "×";
  if (o === "/" || o === "÷" || o === "divided by" || o === "over") return "÷";
  if (o === "-" || o === "minus") return "−";
  if (o === "+" || o === "plus") return "+";
  return o;
}

function canonicalOp(op) {
  const o = String(op || "").trim().toLowerCase();
  if (o === "×" || o === "*" || o === "x" || o === "times" || o === "multiplied by" || o === "multiply") return "*";
  if (o === "÷" || o === "/" || o === "divided by" || o === "over" || o === "divide") return "/";
  if (o === "−" || o === "–" || o === "—" || o === "-" || o === "minus" || o === "subtract") return "-";
  if (o === "+" || o === "plus" || o === "add") return "+";
  return "";
}

function normalizeExpr(text) {
  return String(text || "")
    .replace(/[×✕✖⋅·]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/(\d)\s*[xX]\s*(\d)/g, "$1*$2")
    .replace(/(\d)[xX](\d)/g, "$1*$2")
    .replace(/\s+/g, "");
}

function isSafeExpr(text) {
  return /^[\d+\-*/().]+$/.test(String(text || "")) && /[+\-*/]/.test(text) && /\d/.test(text);
}

function evalSafe(expr) {
  const cleaned = normalizeExpr(String(expr || "").replace(/=\s*[?]?\s*$/, ""));
  if (!isSafeExpr(cleaned)) return null;
  if (/[+\-*/]{2,}/.test(cleaned.replace(/^\+/, ""))) return null;
  try {
    const value = Function(`"use strict"; return (${cleaned})`)();
    return formatNumber(value);
  } catch {
    return null;
  }
}

function computePair(a, op, b) {
  const left = Number(a);
  const right = Number(b);
  const cop = canonicalOp(op);
  if (!Number.isFinite(left) || !Number.isFinite(right) || !cop) return null;
  if (cop === "/" && right === 0) return null;
  if (cop === "+") return formatNumber(left + right);
  if (cop === "-") return formatNumber(left - right);
  if (cop === "*") return formatNumber(left * right);
  if (cop === "/") return formatNumber(left / right);
  return null;
}

function factKey(fact) {
  return `${fact.a}${fact.op}${fact.b}`;
}

function makeFact(a, op, b, source) {
  const cop = canonicalOp(op);
  const value = computePair(a, cop, b);
  if (value == null) return null;
  return {
    a: formatNumber(Number(a)),
    op: cop,
    b: formatNumber(Number(b)),
    value,
    source: source || "",
    text: `${formatNumber(Number(a))} ${prettyOp(cop)} ${formatNumber(Number(b))} = ${value}`
  };
}

function prettyExpr(text) {
  return String(text || "")
    .replace(/[xX*]/g, "×")
    .replace(/\//g, "÷")
    .replace(/-/g, "−")
    .replace(/\s+/g, " ")
    .trim();
}

function makeChainFact(expr, value, source) {
  return {
    a: String(expr),
    op: "=",
    b: "",
    value,
    chain: true,
    source: source || expr,
    text: `${prettyExpr(expr)} = ${value}`
  };
}

function addFact(list, fact) {
  if (!fact) return;
  if (list.some((item) => factKey(item) === factKey(fact))) return;
  list.push(fact);
}

function extractFromWords(text, facts) {
  const re = /(\d+(?:\.\d+)?)\s*(plus|minus|times|multiplied by|divided by|over)\s*(\d+(?:\.\d+)?)/gi;
  let match;
  while ((match = re.exec(String(text || "")))) {
    addFact(facts, makeFact(match[1], match[2], match[3], match[0]));
  }
}

function extractFromLine(line, facts) {
  const trimmed = String(line || "").replace(/=\s*[?]?\s*$/, "").trim();
  if (!trimmed || trimmed.length > 64) return;
  const normalized = normalizeExpr(trimmed);
  if (isSafeExpr(normalized)) {
    const opCount = (normalized.match(/[+\-*/]/g) || []).length;
    const value = evalSafe(normalized);
    if (value != null && opCount >= 1) {
      if (opCount === 1) {
        const m = trimmed.match(/(\d+(?:\.\d+)?)\s*([+\-−–—×xX*÷/])\s*(\d+(?:\.\d+)?)/);
        if (m) addFact(facts, makeFact(m[1], m[2], m[3], trimmed));
      } else {
        addFact(facts, makeChainFact(trimmed, value, trimmed));
      }
      return;
    }
  }
  const re = /(\d+(?:\.\d+)?)\s*([+\-−–—×xX*÷/])\s*(\d+(?:\.\d+)?)/g;
  let match;
  while ((match = re.exec(trimmed))) {
    addFact(facts, makeFact(match[1], match[2], match[3], match[0]));
  }
}

function extractStacked(text, facts) {
  const stacked = String(text || "").match(/(\d+(?:\.\d+)?)\s*[\n\r]+\s*([+\-−–—×xX*÷/])\s*(\d+(?:\.\d+)?)/g) || [];
  for (const chunk of stacked) {
    const m = chunk.match(/(\d+(?:\.\d+)?)\s*[\n\r]+\s*([+\-−–—×xX*÷/])\s*(\d+(?:\.\d+)?)/);
    if (m) addFact(facts, makeFact(m[1], m[2], m[3], chunk));
  }
}

function extractFacts(text) {
  const facts = [];
  extractStacked(text, facts);
  for (const line of String(text || "").split(/\n+/)) extractFromLine(line, facts);
  extractFromWords(text, facts);
  return facts;
}

function fromVision(payload) {
  const facts = [];
  const transcription = String(payload?.transcription || payload?.spoken || "").trim();
  if (transcription) extractFacts(transcription).forEach((fact) => addFact(facts, fact));
  const expressions = Array.isArray(payload?.expressions) ? payload.expressions : [];
  for (const item of expressions) {
    const raw = typeof item === "string" ? item : String(item?.text || item?.expr || "");
    if (raw) extractFacts(raw).forEach((fact) => addFact(facts, fact));
  }
  return { transcription, facts };
}

function mergeFacts(...groups) {
  const facts = [];
  let transcription = "";
  for (const group of groups) {
    if (!group) continue;
    if (group.transcription && !transcription) transcription = String(group.transcription);
    for (const fact of group.facts || []) addFact(facts, fact);
  }
  return { transcription, facts, hasExact: facts.length > 0 };
}

function factsText(boardMath) {
  if (!boardMath?.hasExact) {
    return boardMath?.transcription
      ? `They wrote on the board:\n${boardMath.transcription}\nCompute any arithmetic yourself. Do not guess.`
      : "";
  }
  const lines = boardMath.facts.map((fact) => fact.text);
  const wrote = boardMath.transcription ? `They wrote:\n${boardMath.transcription}\n` : "";
  return `${wrote}EXACT ARITHMETIC (never change these numbers):\n${lines.join("\n")}`;
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function numbersEqual(a, b) {
  return Math.abs(Number(a) - Number(b)) < 1e-9;
}

function repairInlineEquations(text) {
  return String(text || "").replace(
    /(\d+(?:\.\d+)?)\s*(plus|minus|times|multiplied by|divided by|[+\-−×x*÷/])\s*(\d+(?:\.\d+)?)\s*(?:is|equals|=)\s*(-?\d+(?:\.\d+)?)/gi,
    (full, a, op, b, given) => {
      const value = computePair(a, op, b);
      if (value == null || numbersEqual(given, value)) return full;
      return `${a} ${prettyOp(op)} ${b} is ${value}`;
    }
  );
}

function repairWithFacts(spoken, facts) {
  let text = repairInlineEquations(spoken);
  const list = Array.isArray(facts) ? facts : [];
  for (const fact of list) {
    if (fact?.value == null || fact.chain || !fact.op || fact.op === "=") continue;
    const a = escapeRegExp(String(fact.a));
    const b = escapeRegExp(String(fact.b));
    const pair = new RegExp(
      `(\\b${a}\\b[\\s\\S]{0,48}\\b${b}\\b[\\s\\S]{0,24}\\b(?:is|equals|=)\\s*)(-?\\d+(?:\\.\\d+)?)`,
      "i"
    );
    text = text.replace(pair, (full, pre, given) => (
      numbersEqual(given, fact.value) ? full : `${pre}${fact.value}`
    ));
  }
  if (list.length === 1) {
    const value = list[0].value;
    text = text.replace(
      /\b(the answer is|that equals|that makes|equals)\s+(-?\d+(?:\.\d+)?)/i,
      (full, lead, given) => (numbersEqual(given, value) ? full : `${lead} ${value}`)
    );
  }
  return text;
}

function spokenHasResult(spoken, facts) {
  const hay = String(spoken || "");
  return (facts || []).some((fact) => new RegExp(`\\b${escapeRegExp(String(fact.value))}\\b`).test(hay));
}

function ensureResult(spoken, boardMath) {
  const facts = boardMath?.facts || [];
  let text = repairWithFacts(spoken, facts);
  if (!boardMath?.hasExact || spokenHasResult(text, facts)) return text;
  const first = facts[0];
  const lead = first.chain || first.op === "="
    ? `${first.text}.`
    : `${first.a} ${prettyOp(first.op)} ${first.b} is ${first.value}.`;
  return text ? `${lead} ${text}` : lead;
}

function collectFromTurn(spokenText, visionPayload) {
  const fromSpeech = { transcription: "", facts: extractFacts(spokenText) };
  const vision = fromVision(visionPayload);
  return mergeFacts(fromSpeech, vision);
}

module.exports = {
  formatNumber,
  prettyOp,
  evalSafe,
  computePair,
  extractFacts,
  fromVision,
  mergeFacts,
  factsText,
  repairWithFacts,
  ensureResult,
  collectFromTurn
};
