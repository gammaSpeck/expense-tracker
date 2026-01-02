export interface Currency {
  code: string; // ISO 4217 code
  symbol: string; // Display symbol
  name: string; // Human friendly name
  locale: string; // locale for formatting
}

/**
 * Reference: https://www.xe.com/symbols/
 */
export const SUPPORTED_CURRENCIES: Currency[] = [
  { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" },
  { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", locale: "zh-CN" },
  { code: "AUD", symbol: "$", name: "Australian Dollar", locale: "en-AU" },
  { code: "CAD", symbol: "$", name: "Canadian Dollar", locale: "en-CA" },
];

export const DEFAULT_CURRENCY_CODE = "INR";

export function getCurrencyByCode(code: string): Currency {
  return (
    SUPPORTED_CURRENCIES.find((c) => c.code === code) || SUPPORTED_CURRENCIES[0]
  );
}

export function formatNumber(value: number, locale = "en-IN") {
  try {
    return value.toLocaleString(locale);
  } catch (e) {
    return value.toString();
  }
}
