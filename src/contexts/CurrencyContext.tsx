import React, { createContext, useContext, useEffect, useState } from "react";
import {
  Currency,
  DEFAULT_CURRENCY_CODE,
  getCurrencyByCode,
  SUPPORTED_CURRENCIES,
} from "@/lib/currency";

interface CurrencyContextType {
  currency: Currency;
  setCurrencyCode: (code: string) => void;
  supported: Currency[];
  formatValue: (value: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

const STORAGE_KEY = "expense-tracker-currency";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencyCode, setCurrencyCodeState] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_CURRENCY_CODE;
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_CURRENCY_CODE;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currencyCode);
    } catch (e) {
      // ignore
    }
  }, [currencyCode]);

  const currency = getCurrencyByCode(currencyCode);

  const setCurrencyCode = (code: string) => {
    setCurrencyCodeState(code);
  };

  const formatValue = (value: number) => {
    try {
      return value.toLocaleString(currency.locale);
    } catch (e) {
      return value.toString();
    }
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrencyCode,
        supported: SUPPORTED_CURRENCIES,
        formatValue,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
