import { formatCurrencyAmount, INR_PER_AED } from "@/lib/country";

export type DisplayCurrency = "AED" | "INR";

export const DEFAULT_DISPLAY_CURRENCY: DisplayCurrency = "AED";

export function isDisplayCurrency(value: unknown): value is DisplayCurrency {
  return value === "AED" || value === "INR";
}

export function convertCurrencyAmount(
  amount: number,
  sourceCurrency: DisplayCurrency,
  displayCurrency: DisplayCurrency,
) {
  if (!Number.isFinite(amount) || sourceCurrency === displayCurrency) return amount;
  if (sourceCurrency === "AED" && displayCurrency === "INR") return Math.round(amount * INR_PER_AED);
  return Math.round(amount / INR_PER_AED);
}

export function formatDisplayCurrency(
  amount: number,
  sourceCurrency: DisplayCurrency,
  displayCurrency: DisplayCurrency,
) {
  return formatCurrencyAmount(
    displayCurrency,
    convertCurrencyAmount(amount, sourceCurrency, displayCurrency),
  );
}