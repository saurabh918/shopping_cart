const { buildChatMessages } = require("./prompt.cjs");
const { enrichProviderError } = require("./diagnostics.cjs");

const DEFAULT_MODELS = {
  groq: "llama-3.1-8b-instant",
  openai: "gpt-4o-mini",
};

const PROVIDER_ENDPOINTS = {
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
};

function readLlmConfig(env = process.env) {
  const provider = String(env.LLM_PROVIDER || "groq").toLowerCase().trim();
  const model = String(env.LLM_MODEL || DEFAULT_MODELS[provider] || "").trim();
  const apiKey = env.LLM_API_KEY ? String(env.LLM_API_KEY).trim() : "";
  const timeoutMs = Number(env.LLM_TIMEOUT_MS) > 0 ? Number(env.LLM_TIMEOUT_MS) : 15000;

  return { provider, model, apiKey, timeoutMs };
}

function isSupportedProvider(provider) {
  return Object.prototype.hasOwnProperty.call(PROVIDER_ENDPOINTS, provider);
}

function createLlmClient(options = {}) {
  const config = {
    ...readLlmConfig(options.env),
    ...(options.config || {}),
  };
  const fetchImpl = options.fetchImpl || fetch;

  return {
    getConfig() {
      return {
        provider: config.provider,
        model: config.model,
        timeoutMs: config.timeoutMs,
        hasApiKey: Boolean(config.apiKey),
      };
    },
    isConfigured() {
      return Boolean(config.apiKey) && isSupportedProvider(config.provider) && Boolean(config.model);
    },
    async generateAnswer({ question, products }) {
      if (!this.isConfigured()) {
        const error = new Error("LLM is not configured.");
        error.code = "LLM_NOT_CONFIGURED";
        throw enrichProviderError(error, { durationMs: 0 });
      }

      const endpoint = PROVIDER_ENDPOINTS[config.provider];
      const messages = buildChatMessages(question, products);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
      const startedAt = Date.now();

      try {
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages,
            temperature: 0.2,
          }),
          signal: controller.signal,
        });

        const rawText = await response.text();
        let payload;
        try {
          payload = rawText ? JSON.parse(rawText) : null;
        } catch {
          const error = new Error("Provider returned malformed JSON.");
          error.code = "LLM_BAD_RESPONSE";
          throw enrichProviderError(error, {
            durationMs: Date.now() - startedAt,
            httpStatus: response.status,
          });
        }

        if (!response.ok) {
          const error = new Error("Provider request failed.");
          error.code = response.status === 429 ? "LLM_RATE_LIMIT" : "LLM_PROVIDER_ERROR";
          throw enrichProviderError(error, {
            durationMs: Date.now() - startedAt,
            httpStatus: response.status,
          });
        }

        const content = payload?.choices?.[0]?.message?.content;
        if (typeof content !== "string" || !content.trim()) {
          const error = new Error("Provider returned an empty answer.");
          error.code = "LLM_EMPTY_RESPONSE";
          throw enrichProviderError(error, {
            durationMs: Date.now() - startedAt,
            httpStatus: response.status,
          });
        }

        return content.trim();
      } catch (err) {
        if (err.name === "AbortError") {
          const error = new Error("Provider request timed out.");
          error.code = "LLM_TIMEOUT";
          throw enrichProviderError(error, { durationMs: Date.now() - startedAt });
        }
        if (err.code && err.classification) {
          throw err;
        }
        throw enrichProviderError(err, { durationMs: Date.now() - startedAt });
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

module.exports = {
  DEFAULT_MODELS,
  PROVIDER_ENDPOINTS,
  readLlmConfig,
  createLlmClient,
  isSupportedProvider,
};
