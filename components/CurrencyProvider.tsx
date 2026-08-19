"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_DISPLAY_CURRENCY,
  type DisplayCurrency,
  isDisplayCurrency,
} from "@/lib/currency";

const STORAGE_KEY = "millionflats-display-currency";

type CurrencyContextValue = {
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => void;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<DisplayCurrency>(DEFAULT_DISPLAY_CURRENCY);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isDisplayCurrency(saved)) setCurrency(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const value = useMemo(() => ({ currency, setCurrency }), [currency]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency must be used within CurrencyProvider");
  return context;
}