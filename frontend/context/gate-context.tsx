"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "peripartum_context_confirmed";

interface GateContextValue {
  /** True once we know a gate is needed (gender !== "female") */
  gateRequired: boolean;
  /** True once the patient has answered the gate question */
  gateCleared: boolean;
  /** Called by the dashboard page when patient gender is known */
  setGateRequired: (required: boolean) => void;
  /** Called by GenderContextGate when the patient picks "continue" */
  markCleared: () => void;
}

const GateContext = createContext<GateContextValue>({
  gateRequired: false,
  gateCleared: true,
  setGateRequired: () => {},
  markCleared: () => {},
});

export function GateProvider({ children }: { children: React.ReactNode }) {
  const [gateRequired, setGateRequiredState] = useState(false);
  const [gateCleared, setGateCleared] = useState(true); // optimistic — corrected on mount

  // On mount, restore cleared state from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored !== "true") {
      // Don't force cleared=false yet — we wait until gender is known (setGateRequired)
    }
  }, []);

  const setGateRequired = useCallback((required: boolean) => {
    if (!required) {
      // Female patient — no gate needed, always cleared
      setGateRequiredState(false);
      setGateCleared(true);
      return;
    }
    setGateRequiredState(true);
    // Check if already confirmed this session
    const stored = sessionStorage.getItem(STORAGE_KEY);
    setGateCleared(stored === "true");
  }, []);

  const markCleared = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setGateCleared(true);
  }, []);

  return (
    <GateContext.Provider value={{ gateRequired, gateCleared, setGateRequired, markCleared }}>
      {children}
    </GateContext.Provider>
  );
}

export function useGateContext() {
  return useContext(GateContext);
}
