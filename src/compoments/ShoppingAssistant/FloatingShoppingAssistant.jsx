import React, { useCallback, useEffect, useId, useRef } from "react";
import { AiOutlineClose, AiOutlineComment } from "react-icons/ai";
import ShoppingAssistant from "./ShoppingAssistant";
import { AssistantPanelProvider, useAssistantPanel } from "./AssistantPanelContext";
import "./FloatingShoppingAssistant.css";

function FloatingShoppingAssistantShell() {
  const panelId = useId();
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef(null);
  const { isOpen, toggleAssistant, closeAssistant } = useAssistantPanel();

  const handleEscape = useCallback(
    (event) => {
      if (event.key === "Escape" && isOpen) {
        closeAssistant();
      }
    },
    [closeAssistant, isOpen],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleEscape]);

  useEffect(() => {
    if (isOpen && panelRef.current) {
      const input = panelRef.current.querySelector(".shopping-assistant__composer input");
      if (input) {
        input.focus();
      } else {
        const focusable = panelRef.current.querySelector(
          "button, input, textarea, select, [tabindex]:not([tabindex='-1'])",
        );
        focusable?.focus();
      }
    }
  }, [isOpen]);

  return (
    <div className="floating-assistant">
      {isOpen ? (
        <button
          type="button"
          className="floating-assistant__backdrop"
          aria-label="Close shopping assistant"
          onClick={closeAssistant}
        />
      ) : null}

      <div
        id={panelId}
        ref={panelRef}
        className={`floating-assistant__panel ${isOpen ? "floating-assistant__panel--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        aria-hidden={!isOpen}
        hidden={!isOpen}
      >
        <header className="floating-assistant__panel-header">
          <div className="floating-assistant__panel-heading">
            <h2 id={titleId} className="floating-assistant__panel-title">
              Shopping Assistant
            </h2>
            <p id={descId} className="floating-assistant__panel-desc">
              Ask about products in this catalog using natural language.
            </p>
          </div>
          <button
            type="button"
            className="floating-assistant__close"
            aria-label="Close shopping assistant"
            onClick={closeAssistant}
          >
            <AiOutlineClose aria-hidden="true" />
          </button>
        </header>
        <div className="floating-assistant__panel-body">
          <ShoppingAssistant variant="panel" hideHeader />
        </div>
      </div>

      <button
        type="button"
        className="floating-assistant__launcher"
        aria-label={isOpen ? "Close shopping assistant" : "Open shopping assistant"}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={toggleAssistant}
      >
        <AiOutlineComment className="floating-assistant__launcher-icon" aria-hidden="true" />
        <span className="floating-assistant__launcher-text">Assistant</span>
      </button>
    </div>
  );
}

const FloatingShoppingAssistant = ({ children }) => (
  <AssistantPanelProvider>
    {children}
    <FloatingShoppingAssistantShell />
  </AssistantPanelProvider>
);

export default FloatingShoppingAssistant;
