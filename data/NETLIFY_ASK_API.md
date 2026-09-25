# Netlify Function: `ask` (Phase 6B + 6C + 6D)

## Purpose

`netlify/functions/ask.js` exposes a **retrieval-first** shopping assistant API:

1. **Keyword retrieval** (same idea as `src/retrieval/retrieveProducts.js` — not vector search).
2. **Optional hosted LLM** (Phase 6C) that answers using **only** retrieved catalog context.

The **Shopping Assistant UI** (Phase 6D) on the Home page calls this endpoint via `src/services/assistantApi.js`.

## Architecture

```text
Browser (ShoppingAssistant)
        │ POST /.netlify/functions/ask
        ▼
  ask.js (validation)
        │
        ▼
  askOrchestrator.cjs
        │
        ├─ retrieveProducts.cjs
        │
        ├─ no matches ──► answerSource: retrieval-fallback (no LLM call)
        │
        ├─ missing LLM config ──► answerSource: configuration-fallback
        │
        └─ LLM configured ──► llm/prompt.cjs + llm/provider.cjs
```

## Provider (Phase 6C)

**Default provider:** `groq` via Groq’s **OpenAI-compatible** Chat Completions API (`https://api.groq.com/openai/v1/chat/completions`).

**Why Groq:** Works with Netlify Functions using native `fetch`, no SDK required, and is easy to swap. **Alternative:** set `LLM_PROVIDER=openai` for OpenAI’s compatible endpoint.

**Default model (Groq):** `llama-3.1-8b-instant` (override with `LLM_MODEL`).

**Important:** Free tiers, quotas, and signup requirements **change over time**. Verify on the provider’s official site before relying on them. This repo does **not** guarantee a free tier.

## Environment variables (server-side only)

Set in Netlify **Site settings → Environment variables** or a local `.env` used by `netlify dev` (never commit secrets).

| Variable | Required | Description |
|----------|----------|-------------|
| `LLM_API_KEY` | For AI answers | Provider API key |
| `LLM_PROVIDER` | No | `groq` (default) or `openai` |
| `LLM_MODEL` | No | Model id (provider-specific) |
| `LLM_TIMEOUT_MS` | No | Default `15000` |

Copy `.env.example` to `.env` locally with placeholder values only.

**Never** use `REACT_APP_*` for the API key.

## Endpoint

```
POST /.netlify/functions/ask
```

### Request

```json
{
  "question": "Which products are available?"
}
```

### Success response (200)

Phase 6B fields are preserved. Phase 6C adds optional `answer` and `answerSource`:

```json
{
  "success": true,
  "query": "Which products are available?",
  "normalizedQuery": "which products are available?",
  "matches": [
    {
      "product": { "id": 0, "name": "...", "blurb": "..." },
      "score": 12,
      "reasons": ["..."],
      "matchedTerms": ["available"]
    }
  ],
  "message": "Generated response based on retrieved catalog context.",
  "unsupportedTerms": [],
  "answer": "Natural language summary grounded in the matches...",
  "answerSource": "llm"
}
```

### `answerSource` values

| Value | Meaning |
|--------|---------|
| `llm` | Hosted model generated `answer` from retrieved context |
| `retrieval-fallback` | No (or insufficient) matches; LLM not called |
| `configuration-fallback` | Matches found but `LLM_API_KEY` not configured |
| `provider-error-fallback` | LLM call failed, empty response, or weak name guard |

### Error response (4xx / 5xx)

```json
{
  "success": false,
  "error": "Human-readable message"
}
```

## Grounding and limits

- At most **5** products are sent to the LLM (`MAX_CONTEXT_PRODUCTS`).
- Context includes factual fields and `blurb` only (no full database).
- System prompt requires catalog-only answers and refusal when data is missing.
- A **light guard** checks that product **names** in the LLM answer appear in the retrieved set. This is **not** full hallucination prevention.

## Catalog sync

- **Source of truth:** `src/data/products.json`
- **Function copy:** `netlify/lib/products.json` via `npm run sync:catalog` / `prebuild`

Run manually before local function tests:

```bash
npm run sync:catalog
```

## Local startup

`npm start` alone serves the React app but **does not** expose Netlify Functions.

For integrated local testing (SPA + functions):

```bash
npm run build
npx netlify dev --offline --framework "#static" -d build
```

Default proxy URL: `http://localhost:8888` (functions at `/.netlify/functions/ask`).

Alternative (hot reload): ensure port **3000** is free, then `npx netlify dev --offline` so Netlify starts CRA and proxies functions.

**Verified in this repo (automated):** handler tests, retrieval tests, Assistant unit tests, production build.

**Not verified unless you run it:** live provider calls, production Netlify deploy, and full browser regression on every checklist item.

## Mock testing (no live LLM)

```bash
npm run test:ask-api
npm run demo:retrieval
npm run test:assistant
```

Handler tests live in `netlify/tests/ask.handler.test.js` (not deployed as a function).

## Live LLM (optional, manual)

1. `npm run sync:catalog`
2. Create `.env` from `.env.example` with a real `LLM_API_KEY` (gitignored)
3. `npx netlify dev` (or static mode above with `.env` loaded)
4. POST to `http://localhost:8888/.netlify/functions/ask` or use the Home page Assistant

If no `.env` is present, expect `answerSource: configuration-fallback` when matches exist.

## Deployment requirements

From `netlify.toml`:

| Setting | Value |
|---------|--------|
| Build command | `npm run build` (runs `prebuild` → `sync:catalog`) |
| Publish directory | `build` |
| Functions directory | `netlify/functions` |
| Node bundler | `esbuild` |

Set `LLM_*` variables in the Netlify dashboard for AI answers in production.

## SPA routing

`public/_redirects` must use a Netlify-valid destination (for example `/* /index.html 200`) so client routes such as `/cart` work after deploy. The file is copied into `build/` during `npm run build`.

## Fallback behavior (summary)

| Condition | LLM called? | Typical `answerSource` |
|-----------|-------------|-------------------------|
| No matches | No | `retrieval-fallback` |
| Matches, no API key | No | `configuration-fallback` |
| Matches, LLM success | Yes | `llm` |
| Matches, LLM error / empty / name guard | Yes (attempted) | `provider-error-fallback` |

Retrieval `matches` are included whenever retrieval finds them, including provider failures.

## Known limitations

- Keyword retrieval only (no embeddings / vector DB).
- LLM grounding is prompt + limited context + name guard — not hallucination-proof.
- `npm start` without Netlify does not serve the ask function.
- Port 3000 conflicts can prevent default `netlify dev` from starting a second CRA instance.
- Legacy `src/App.test.js` may still fail (CRA boilerplate; app requires `CartProvider`).

## Security

- API keys stay in Netlify / local `.env` (gitignored).
- Keys are not logged or returned in JSON responses.
- User questions are not logged by the handler.
- Cart and auth are unchanged.
