"use strict";

/**
 * Ask several talk models the same tricky turns and print what they say.
 *
 * The tutor lives or dies on whether the model stays on the topic the child
 * named, so compare them on the turns that broke:
 *   node scripts/compare-talk-models.js
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function loadEnvConfig() {
  const stateDir = process.env.LUMI6_STATE_DIR
    ? path.resolve(process.env.LUMI6_STATE_DIR)
    : path.join(os.homedir(), ".lumi6");
  for (const configPath of [
    path.join(stateDir, "config.env"),
    path.join(ROOT, ".env"),
    path.join(ROOT, "config.env")
  ]) {
    try {
      if (!fs.existsSync(configPath)) continue;
      for (const line of fs.readFileSync(configPath, "utf8").split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx <= 0) continue;
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key] && val) process.env[key] = val;
      }
    } catch {}
  }
}

loadEnvConfig();

const groqTalk = require("../src/primer/tools/groq-talk.js");
const ContextBuilder = require("../src/primer/tutor/context-builder.js");
const { understandLearner } = require("../src/primer/tutor/understand.js");
const { parseProposal } = require("../src/primer/tutor/proposal.js");
const { spokenCoversTopic, deniesTopic } = require("../src/primer/topic.js");

const TURNS = [
  { text: "Hi I want you to teach me theory of relativity how can I understand it", topic: "relativity", last: "" },
  { text: "Okay can you teach me from first principles", topic: "relativity", last: "Imagine you are on a train and you throw a ball." },
  { text: "what the hell is this what are you doing this is not theory of relativity is it", topic: "relativity", last: "Imagine you are on a train and you throw a ball." }
];

function buildPrompt(turn) {
  const understanding = understandLearner(turn.text, { concept: turn.topic, askedBackLast: Boolean(turn.last) });
  return new ContextBuilder().build({
    state: {
      mode: "autopilot",
      currentConcept: turn.topic,
      learningPhase: "learn",
      conversationState: { lastTeacherSpoken: turn.last, askedBackLast: Boolean(turn.last) },
      misconceptions: []
    },
    child: { name: "Test", age_years: 10, grade: "5" },
    memorySnippets: [],
    understanding,
    decision: { role: "tutor", phase: "learn", action: "explain" },
    history: [],
    retrievalContext: "",
    boardMath: {}
  });
}

async function run(model) {
  process.env.GROQ_MODEL = model;
  console.log(`\n================ ${model} ================`);
  for (const turn of TURNS) {
    const prompt = buildPrompt(turn);
    const started = Date.now();
    try {
      const result = await groqTalk.complete({
        systemPrompt: prompt.talkPrompt,
        userText: prompt.userBlock,
        timeoutMs: 30000
      });
      const spoken = String(parseProposal(result.content)?.spoken || "").trim();
      const covers = spokenCoversTopic(spoken, turn.topic);
      const denies = deniesTopic(spoken, turn.topic);
      console.log(`\n[${Date.now() - started}ms] child: "${turn.text.slice(0, 52)}"`);
      console.log(`  on topic: ${covers && !denies ? "YES" : "NO"}`);
      console.log(`  ${spoken || "(nothing parsed)"}`);
    } catch (err) {
      console.log(`\n[${Date.now() - started}ms] child: "${turn.text.slice(0, 52)}"`);
      console.log(`  failed: ${String(err?.message || err).slice(0, 160)}`);
    }
  }
}

async function main() {
  const models = process.argv.slice(2);
  if (!models.length) {
    console.log("usage: node scripts/compare-talk-models.js <model> [model...]");
    process.exit(1);
  }
  for (const model of models) await run(model);
  console.log("");
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
