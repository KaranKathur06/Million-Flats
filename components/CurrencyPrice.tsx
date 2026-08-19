"use client";

import { formatDisplayCurrency } from "@/lib/currency";
import { useCurrency } from "@/components/CurrencyProvider";

export default function CurrencyPrice({
  amount,
  sourceCurrency = "AED",
}: {
  amount: number;
  sourceCurrency?: "AED" | "INR";
}) {
  const { currency } = useCurrency();
  return <>{formatDisplayCurrency(amount, sourceCurrency, currency)}</>;
}