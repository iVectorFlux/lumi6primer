# Primer Orchestration — Engineering Contract

The child-facing product is **one intelligent conversation**. Canvas, vision, homework inspection, retrieval, and simulation appear only when they help.

This repo is Node.js. The harness’s `services/*.py` map is implemented here:

| Spec | Implementation |
|---|---|
| `services/tutor/orchestrator.py` | `src/primer/tutor/orchestrator.js` |
| `services/tutor/state_machine.py` | `src/primer/tutor/state-machine.js` |
| `services/tutor/pedagogical_policy.py` | `src/primer/tutor/pedagogical-policy.js` |
| `services/tutor/role_selector.py` | `src/primer/tutor/role-selector.js` |
| `services/tutor/context_builder.py` | `src/primer/tutor/context-builder.js` |
| `services/tutor/response_policy.py` | `src/primer/tutor/response-policy.js` |
| `services/learner/*` | `src/primer/learner/` |
| `services/planner/*` | `src/primer/planner/` |
| `services/curriculum/*` | `src/primer/curriculum/` |
| `services/safety/*` | `src/primer/safety/` |
| `services/tools/retrieval.py` | `src/primer/tools/retrieval.js` |

## Control loop

```
LLM proposes interpretation/actions
        ↓
Pedagogical Policy validates
        ↓
Orchestrator executes
```

The model does not own phase, role, or tools.

## Modes

- **Manual** — “Ask anything”
- **Autopilot** — “Teach me” (planner picks the next experience)

Same conversation. No lesson chrome.

## State machine

Story → Think → Learn → Think Again → Become

Become is the longitudinal outcome, not a moral-education module.

## Roles

Advisor · Librarian · Tutor · Editor · Thinking Partner

## Learner model

Knowledge · Thinking · Learning · Becoming — updated from evidence, not lesson completion.
