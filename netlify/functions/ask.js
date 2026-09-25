const { handleAskRequest } = require("../lib/askOrchestrator.cjs");
const { createCorrelationId } = require("../lib/llm/diagnostics.cjs");

const MAX_QUESTION_LENGTH = 500;
const MAX_BODY_LENGTH = 8000;

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

let llmClientOverride = null;

function respond(statusCode, payload) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  };
}

function parseRequestBody(event) {
  if (event.body == null || event.body === "") {
    return { ok: false, error: "Request body is required." };
  }

  let raw = event.body;
  if (event.isBase64Encoded) {
    raw = Buffer.from(raw, "base64").toString("utf8");
  }

  if (raw.length > MAX_BODY_LENGTH) {
    return { ok: false, error: "Request body is too large." };
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "Request body must be a JSON object." };
    }
    return { ok: true, body: parsed };
  } catch {
    return { ok: false, error: "Request body must be valid JSON." };
  }
}

function validateQuestion(question) {
  if (question == null) {
    return { ok: false, error: 'Missing "question" field.' };
  }
  if (typeof question !== "string") {
    return { ok: false, error: '"question" must be a string.' };
  }
  const trimmed = question.trim();
  if (!trimmed) {
    return { ok: false, error: '"question" cannot be empty.' };
  }
  if (trimmed.length > MAX_QUESTION_LENGTH) {
    return {
      ok: false,
      error: `"question" must be at most ${MAX_QUESTION_LENGTH} characters.`,
    };
  }
  return { ok: true, question: trimmed };
}

/**
 * Netlify Function: retrieval-first shopping assistant API (Phase 6C adds optional LLM).
 */
const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        ...JSON_HEADERS,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return respond(405, {
      success: false,
      error: "Method not allowed. Use POST.",
    });
  }

  try {
    const parsedBody = parseRequestBody(event);
    if (!parsedBody.ok) {
      return respond(400, { success: false, error: parsedBody.error });
    }

    const validated = validateQuestion(parsedBody.body.question);
    if (!validated.ok) {
      return respond(400, { success: false, error: validated.error });
    }

    const requestStartedAt = Date.now();
    const result = await handleAskRequest(validated.question, {
      llmClient: llmClientOverride || undefined,
      correlationId: createCorrelationId(),
      requestStartedAt,
    });

    if (result.success === false) {
      return respond(503, {
        success: false,
        error: result.error || "The assistant catalog is not configured correctly.",
      });
    }

    return respond(200, result);
  } catch {
    return respond(500, {
      success: false,
      error: "Unable to process the request.",
    });
  }
};

module.exports = { handler };
module.exports.handler = handler;
module.exports.__setLlmClientForTests = (client) => {
  llmClientOverride = client;
};
module.exports.__resetLlmClientForTests = () => {
  llmClientOverride = null;
};
