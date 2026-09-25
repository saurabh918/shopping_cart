const crypto = require("crypto");

const FORBIDDEN_LOG_KEYS = new Set([
  "apikey",
  "api_key",
  "authorization",
  "llm_api_key",
  "prompt",
  "messages",
  "answer",
  "question",
  "products",
  "context",
  "stack",
]);

/**
 * Internal failure classifications (server logs only).
 */
function classifyProviderErrorCode(code, httpStatus) {
  if (code === "LLM_TIMEOUT") return "provider_timeout";
  if (code === "LLM_BAD_RESPONSE") return "invalid_provider_response";
  if (code === "LLM_EMPTY_RESPONSE") return "empty_provider_content";
  if (code === "LLM_RATE_LIMIT" || code === "LLM_PROVIDER_ERROR") {
    return "provider_http_error";
  }
  if (code === "LLM_NOT_CONFIGURED") return "orchestrator_error";
  return "orchestrator_error";
}

function createCorrelationId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString("hex");
}

function sanitizeLogEntry(entry) {
  const safe = {};
  Object.entries(entry || {}).forEach(([key, value]) => {
    if (FORBIDDEN_LOG_KEYS.has(String(key).toLowerCase())) return;
    if (value === undefined) return;
    safe[key] = value;
  });
  return safe;
}

/**
 * Writes one JSON log line. Never pass secrets, prompts, or full catalog context.
 */
function logAssistantEvent(entry, logFn = console.log) {
  const payload = sanitizeLogEntry({
    event: "assistant_diagnostics",
    ...entry,
  });
  logFn(JSON.stringify(payload));
}

function enrichProviderError(error, { durationMs, httpStatus } = {}) {
  if (!error || typeof error !== "object") return error;
  const status = httpStatus ?? error.status;
  if (status != null) error.status = status;
  if (durationMs != null) error.durationMs = durationMs;
  error.classification = classifyProviderErrorCode(error.code, status);
  return error;
}

module.exports = {
  classifyProviderErrorCode,
  createCorrelationId,
  sanitizeLogEntry,
  logAssistantEvent,
  enrichProviderError,
};
