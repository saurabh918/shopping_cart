const ASK_ENDPOINT = "/.netlify/functions/ask";
export const MAX_QUESTION_LENGTH = 500;

export async function askAssistant(question) {
  const response = await fetch(ASK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    const error = new Error("The assistant returned an invalid response.");
    error.code = "INVALID_JSON";
    throw error;
  }

  if (!response.ok) {
    const error = new Error(data?.error || "The assistant request failed.");
    error.code = "HTTP_ERROR";
    error.status = response.status;
    throw error;
  }

  if (!data || typeof data !== "object") {
    const error = new Error("The assistant returned an unexpected response.");
    error.code = "INVALID_SHAPE";
    throw error;
  }

  if (data.success === false) {
    const error = new Error(data.error || "The assistant could not process your question.");
    error.code = "API_ERROR";
    throw error;
  }

  return data;
}
