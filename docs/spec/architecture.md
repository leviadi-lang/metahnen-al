# Architecture

## High-level diagram

```
┌─────────────┐      ┌──────────────┐      ┌────────────────────┐
│  Make.com   │──────│  Webhook /   │──────│  Master            │
│  scenarios  │      │  Express     │      │  Orchestrator      │
└─────────────┘      └──────────────┘      │  (Opus 4.7)        │
                                           └────────┬───────────┘
                                                    │ route_to_agent
                                  ┌─────────────────┼──────────────────┐
                                  ↓                 ↓                  ↓
                          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                          │  Customer    │  │   Sales      │  │  Lead Intake │
                          │  Service     │  │   Agent      │  │  Agent       │
                          │  (Sonnet 4.6)│  │  (Sonnet 4.6)│  │  (Sonnet 4.6)│
                          └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                                 │                 │                 │
                                 │   ┌─────────────┴────┐            │
                                 │   ↓                  │            │
                          ┌──────┴───────┐  ┌──────────┴───┐         │
                          │ Tool runner  │  │ Operations    │         │
                          │ (Anthropic)  │  │ Agent (Sonnet)│         │
                          └──────┬───────┘  └──────┬────────┘         │
                                 │                 │                  │
                                 ↓                 ↓                  ↓
                       ┌──────────────────────────────────────────────────┐
                       │              7 shared tools                       │
                       │  send_whatsapp / send_email / create_crm_process /│
                       │  update_crm_status / schedule_meeting /           │
                       │  classify_document / summarize_meeting            │
                       └──────────────────────┬───────────────────────────┘
                                              ↓
              ┌───────────────────────────────────────────────────────────┐
              │  Integration interfaces  (src/integrations/*/client.ts)    │
              │  ─ mock implementations today (default)                    │
              │  ─ real providers next (CRM / Meta WhatsApp / Google APIs) │
              └────────────────────────────────────────────────────────────┘
```

## Decision rationale

### Why Master orchestrates with Claude (not hard-coded routing)

The spec marks the Master as the brain. Routing decisions depend on Hebrew intent, customer history, and compliance signals — encoding all of that as `if/else` would freeze the system. Instead, Master is given a single tool (`route_to_agent`) that constrains it to one of five outputs; Claude does the natural-language understanding.

A deterministic guard (`src/orchestrator/escalation.ts`) short-circuits the Master *before* the API call when text contains red-flag phrases (Hebrew legal threats, regulator complaints, explicit personal-advice requests). Defense in depth — the prompt also enforces this, but we keep a code-level check so a prompt regression cannot silently drop these.

### Why a generic sub-agent runner (`base-agent.ts`)

All four sub-agents share the same wire shape — load a prompt, scope tools, run the tool-use loop, return a result. The differences are config: which prompt, which tools, which `effort` level, whether thinking is on. Sharing the runner means a fix or improvement to the tool loop applies to all four.

### Why integrations are interface + mock from day one

The CRM provider hasn't been chosen yet (Migdal? Harel? Salesforce-based?). WhatsApp needs Meta approval. Locking the application to a specific provider this early would block the build. The `client.ts` interface defines the contract; `mock.ts` ships a working implementation today; a `real.ts` next to it can drop in when the provider is known. Tools never import a specific implementation — they call `getCrmClient()` and trust the registry.

### Why an in-memory store for memory

The spec lists "memory priorities: CRM = source of truth → AI short-term context → automation logs". The Master and sub-agents only need short-term context — a few notes per conversation, the last agent, the process stage. That fits in process memory at our current scale. The interface (`MemoryStore`) is shaped so swapping to Redis later requires changing one factory function.

### Why Opus 4.7 for Master and Sonnet 4.6 for sub-agents

Master sees the entire context (customer history, all four routing options, escalation triggers) and must reason about compliance. Opus 4.7's adaptive thinking + higher reasoning ceiling matter most here. Sub-agents have narrower scope and benefit from Sonnet 4.6's speed/cost balance. Document classification uses Haiku 4.5 — fastest and cheapest, sufficient for taxonomy mapping.

### Why Hebrew prompts in their own files

Prompts in `src/prompts/*.md` are loaded at runtime by `loader.ts`. Keeping them in Markdown:
- Lets non-developers (the office team) read and propose changes
- Keeps Hebrew content out of TypeScript string literals (where it's easy to break with escape characters)
- Makes diffs reviewable in plain text

### Why we don't auto-commit large content folders

The repo coexists with ~1.5GB of source PDFs, MP4s, and PPTX (the lecture / reference material in `דשבורד תפעול/` and `מסמכים פרוייקט עדי/`). `.gitignore` excludes those folders and any loose `*.mp4` / `*.pdf` / `*.pptx` at the repo root. The single exception is `docs/spec/original-spec.docx` — the system specification itself is part of the codebase.

## Data flow — a single customer message

1. Make.com receives a WhatsApp event.
2. Make.com calls `POST /webhooks/customer-message` with `{channel, customer_id, text}`.
3. Express validates via zod, builds an `InboundEvent`, hands it to `handleInboundEvent()`.
4. `checkHardEscalationRules(text)` runs deterministic regexes. Match → return `{escalated, severity}` immediately.
5. Memory store is consulted for prior context on this `customer_id`.
6. `routeWithMaster()` calls Claude Opus 4.7 with the master system prompt and a single forced tool (`route_to_agent`). Captured tool call → routing decision.
7. Dispatcher invokes the chosen sub-agent's `runXxxAgent()`. The sub-agent runs the Anthropic SDK tool runner against its scoped tool subset.
8. Tools execute against the mock providers; results are logged and returned to the sub-agent, which decides the next turn or finishes.
9. Final agent output (Hebrew text) and the list of tool calls return up the stack.
10. Master merges new context into the memory store under the customer key.
11. Response (`{routing, agent_result}`) is returned as JSON to Make.com.

## Failure modes

| Failure | Behavior |
|---|---|
| Master's API call fails | Express error handler returns 500; Make.com retries |
| Master fails to emit `route_to_agent` | Treated as escalation (defensive default) |
| Sub-agent hits `max_tokens` | `stop_reason: 'max_turns'` returned; caller decides whether to retry |
| Tool throws | Tool runner propagates; sub-agent reports the failure in its output |
| Mock integration unreachable | Mocks never fail in dev; real providers will use retry policies per spec §13 |
