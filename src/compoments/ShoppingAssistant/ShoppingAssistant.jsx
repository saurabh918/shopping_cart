import React, { useCallback, useId, useRef, useState } from "react";
import { AiOutlineSend } from "react-icons/ai";
import { askAssistant, MAX_QUESTION_LENGTH } from "../../services/assistantApi";
import "./ShoppingAssistant.css";

const SUGGESTED_QUESTIONS = [
  "Which products are in stock?",
  "Which products have fast delivery?",
  "What is the price of iPhone 6S?",
];

const SOURCE_LABELS = {
  llm: "AI response",
  "retrieval-fallback": "Catalog fallback",
  "configuration-fallback": "AI configuration unavailable",
  "provider-error-fallback": "Provider unavailable",
};

function getSourceLabel(answerSource) {
  if (!answerSource) return null;
  return SOURCE_LABELS[answerSource] || "Assistant response";
}

function AssistantMatchCard({ match }) {
  const product = match?.product;
  if (!product) return null;

  const price = Number.isFinite(Number(product.price)) ? `$${product.price}` : null;
  const inStock = Number(product.inStock) > 0;
  const stockText = inStock
    ? `${product.inStock} in stock`
    : "Out of stock";

  return (
    <li className="assistant-match">
      <h3 className="assistant-match__name">{product.name || "Unnamed product"}</h3>
      {price && <p className="assistant-match__price">{price}</p>}
      <p className="assistant-match__meta">{stockText}</p>
      {Number.isFinite(Number(product.deliveryDays)) && (
        <p className="assistant-match__meta">
          Delivery: {product.deliveryDays} day{product.deliveryDays === 1 ? "" : "s"}
          {product.fastDelivery ? " (fast delivery available)" : ""}
        </p>
      )}
      {Number.isFinite(Number(product.ratings)) && (
        <p className="assistant-match__meta">Rating: {product.ratings} / 5</p>
      )}
      {product.blurb && (
        <p className="assistant-match__blurb">{product.blurb}</p>
      )}
    </li>
  );
}

const ShoppingAssistant = ({ hideHeader = false, variant = "default" }) => {
  const inputId = useId();
  const statusId = useId();
  const inputRef = useRef(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [matches, setMatches] = useState([]);
  const [answerSource, setAnswerSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");

  const resetResponse = useCallback(() => {
    setAnswer("");
    setMatches([]);
    setAnswerSource(null);
  }, []);

  const submitQuestion = useCallback(async (rawQuestion) => {
    const trimmed = rawQuestion.trim();
    setValidationError("");
    setError("");

    if (!trimmed) {
      setValidationError("Please enter a question about the product catalog.");
      return;
    }
    if (trimmed.length > MAX_QUESTION_LENGTH) {
      setValidationError(`Question must be at most ${MAX_QUESTION_LENGTH} characters.`);
      return;
    }

    setLoading(true);
    setLastQuestion(trimmed);
    setQuestion("");
    resetResponse();
    inputRef.current?.focus();

    try {
      const data = await askAssistant(trimmed);
      setAnswer(typeof data.answer === "string" ? data.answer : "");
      setMatches(Array.isArray(data.matches) ? data.matches : []);
      setAnswerSource(data.answerSource || null);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      resetResponse();
    } finally {
      setLoading(false);
    }
  }, [resetResponse]);

  const handleSubmit = (event) => {
    event.preventDefault();
    submitQuestion(question);
  };

  const handleSuggestion = (text) => {
    setQuestion(text);
    setValidationError("");
  };

  const sourceLabel = getSourceLabel(answerSource);
  const showAnswer = Boolean(answer);
  const showMatches = matches.length > 0;
  const showNoMatchesNote = !loading && !error && answer && !showMatches;

  const rootClassName = [
    "shopping-assistant",
    variant === "panel" ? "shopping-assistant--panel" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const suggestions = (
    <div className="shopping-assistant__suggestions" role="group" aria-label="Suggested questions">
      {SUGGESTED_QUESTIONS.map((text) => (
        <button
          key={text}
          type="button"
          className="shopping-assistant__suggestion"
          onClick={() => handleSuggestion(text)}
        >
          {text}
        </button>
      ))}
    </div>
  );

  const statusBlock = (
    <div
      id={statusId}
      className={`shopping-assistant__status ${error || validationError ? "shopping-assistant__status--error" : ""} ${loading ? "shopping-assistant__status--loading" : ""}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {loading && "Loading answer from the catalog assistant…"}
      {variant !== "panel" && validationError}
      {error}
    </div>
  );

  const resultsBlock = (
    <>
      {showAnswer && (
        <div className="shopping-assistant__response">
          {sourceLabel && (
            <span className="shopping-assistant__source">{sourceLabel}</span>
          )}
          <p className="shopping-assistant__answer">{answer}</p>
        </div>
      )}

      {showMatches && (
        <>
          <h3 className="shopping-assistant__matches-title">Related products</h3>
          <ul className="shopping-assistant__matches">
            {matches.map((match) => (
              <AssistantMatchCard
                key={match.product?.id ?? match.product?.name}
                match={match}
              />
            ))}
          </ul>
        </>
      )}

      {showNoMatchesNote && (
        <p className="shopping-assistant__empty-matches">
          No specific product records were matched for this question.
        </p>
      )}
    </>
  );

  const questionForm = (formClassName, compact = false) => (
    <form className={formClassName} onSubmit={handleSubmit} noValidate>
      <div className="shopping-assistant__field">
        <label
          className={compact ? "sr-only shopping-assistant__label" : "shopping-assistant__label"}
          htmlFor={inputId}
        >
          Your question
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className="shopping-assistant__input"
          value={question}
          maxLength={MAX_QUESTION_LENGTH}
          placeholder={
            compact
              ? (lastQuestion ? "Ask another question…" : "Ask about a product…")
              : (lastQuestion ? "Ask another question…" : "e.g. Which products are in stock?")
          }
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
          aria-describedby={statusId}
          autoComplete="off"
        />
      </div>
      <button
        type="submit"
        className={`btn-action btn-action--primary shopping-assistant__submit ${compact ? "shopping-assistant__submit--icon" : ""}`}
        disabled={loading || !question.trim()}
        {...(compact
          ? { "aria-label": loading ? "Sending question" : "Send question" }
          : {})}
      >
        {compact ? (
          <>
            <AiOutlineSend aria-hidden="true" className="shopping-assistant__submit-icon" />
            <span className="sr-only">{loading ? "Asking…" : "Ask"}</span>
          </>
        ) : (
          loading ? "Asking…" : "Ask"
        )}
      </button>
    </form>
  );

  return (
    <section
      className={rootClassName}
      aria-labelledby={hideHeader ? undefined : "shopping-assistant-title"}
      aria-label={hideHeader ? "Shopping assistant conversation" : undefined}
    >
      {!hideHeader && (
        <header className="shopping-assistant__header">
          <h2 id="shopping-assistant-title" className="shopping-assistant__title">
            Shopping Assistant
          </h2>
          <p className="shopping-assistant__description">
            Ask about products in this catalog. Answers use retrieved catalog data and may use AI when configured on the server.
          </p>
        </header>
      )}

      {variant === "panel" ? (
        <>
          <div className="shopping-assistant__scroll" aria-label="Assistant messages and results">
            {suggestions}
            {lastQuestion && (
              <p className="shopping-assistant__user-question">
                <span className="shopping-assistant__user-question-label">You asked</span>
                {lastQuestion}
              </p>
            )}
            {statusBlock}
            {resultsBlock}
          </div>
          <footer className="shopping-assistant__composer">
            {validationError && (
              <p className="shopping-assistant__composer-error" role="alert">
                {validationError}
              </p>
            )}
            {questionForm("shopping-assistant__form shopping-assistant__form--composer", true)}
          </footer>
        </>
      ) : (
        <>
          {suggestions}
          {questionForm("shopping-assistant__form")}
          {statusBlock}
          {resultsBlock}
        </>
      )}
    </section>
  );
};

export default ShoppingAssistant;
