import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const AssistantPanelContext = createContext(null);

export function AssistantPanelProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openAssistant = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleAssistant = useCallback(() => {
    setIsOpen((open) => !open);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      openAssistant,
      closeAssistant,
      toggleAssistant,
    }),
    [isOpen, openAssistant, closeAssistant, toggleAssistant],
  );

  return (
    <AssistantPanelContext.Provider value={value}>
      {children}
    </AssistantPanelContext.Provider>
  );
}

export function useAssistantPanel() {
  const ctx = useContext(AssistantPanelContext);
  if (!ctx) {
    throw new Error("useAssistantPanel must be used within AssistantPanelProvider");
  }
  return ctx;
}
