# Product knowledge base (Phase 4)

## Why this exists

This project will later use **retrieval-augmented generation (RAG)** for a shopping assistant. The assistant should answer from **your catalog text**, not from guesses. Phase 4 prepares that text in a structured, searchable format while the UI keeps working as today.

## Where the data lives

Create React App can only **import JSON from `src/`** at build time. The catalog file is:

- **`src/data/products.json`** — single source of truth for the React app and for future server-side retrieval.

When you add a backend (later phase), copy or import this same JSON file into the API project so the UI and the assistant use identical facts.

## Record shape

Each entry in `products` includes:

| Field | Meaning |
|--------|--------|
| `id` | Stable product id (used in cart and lookups) |
| `name` | Display name |
| `price` | Listed price (USD, number) |
| `image` | Image URL (UI only; not required for RAG) |
| `inStock` | Unit count in catalog (0 = cannot add to cart) |
| `fastDelivery` | Boolean flag from the original catalog |
| `deliveryDays` | Estimated delivery days (number) |
| `ratings` | Rating score 1–5 (number) |
| `stockStatus` | `in_stock` or `out_of_stock` (derived from `inStock`) |
| `blurb` | Short paragraph built **only** from the fields above |
| `searchText` | Lowercase keywords for simple future retrieval |

Helper exports in **`src/data/productCatalog.js`**:

- `initialCatalogProducts` — feeds `CartContext` (adds default `qty: 1`).
- `getProductKnowledgeBase()` — strips UI-only fields for retrieval experiments.

## What is factual

Only data that was already in the shopping cart app:

- Names, prices, stock counts, fast-delivery flag, delivery days, and ratings.

Blurbs and `searchText` are **templates** filled from those values. They do not add specs, reviews, brands, warranties, or discounts.

## What is **not** in the catalog

Do not assume or let an LLM invent:

- Product descriptions, CPU/RAM/storage, colors, or model years beyond the name string
- Customer reviews or review text
- Promotions, coupons, or tax/shipping rules
- Cart totals or live inventory (cart state is separate from this file)

If a question needs missing information, the assistant should say it is **not in the catalog**.

## Rules for future AI integration

1. **Retrieve first** — select one or more product records (by id, keyword, or later embeddings).
2. **Pass retrieved blurbs** into the model as context.
3. **Instruct the model** to answer only from that context and to refuse when context is insufficient.
4. **Never** use the LLM to compute cart totals; keep cart math in React/reducer code.

## Keyword retrieval (Phase 5)

Module: **`src/retrieval/retrieveProducts.js`**

This is **simple keyword scoring**, not semantic search, embeddings, or a vector database.

- `normalizeQuery(query)` — trim, lowercase, tokenize.
- `retrieveProducts(query)` — returns `{ query, normalizedQuery, matches, message, unsupportedTerms }`.
- Each match includes the catalog record, a numeric **score**, and short **reasons**.

Run the demo tests:

```bash
npm run demo:retrieval
```

## Validation

On load in development, `productCatalog.js` runs basic checks (unique ids, `stockStatus` vs `inStock`). Run `npm run build` to ensure the JSON still bundles correctly.
