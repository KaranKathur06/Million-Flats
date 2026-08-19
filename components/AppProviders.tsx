"use client";

import React from "react";
import { SessionProvider, type SessionProviderProps } from "next-auth/react";
import CountryProvider from "@/components/CountryProvider";
import MarketProvider from "@/components/MarketProvider";
import AuthConfigProvider from "@/components/auth/AuthConfigProvider";
import { CurrencyProvider } from "@/components/CurrencyProvider";

export default function AppProviders({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: SessionProviderProps["session"];
}) {
  return (
    <SessionProvider session={session}>
      <CountryProvider>
        <CurrencyProvider>
          <MarketProvider>
            <AuthConfigProvider>
              {children}
            </AuthConfigProvider>
          </MarketProvider>
        </CurrencyProvider>
      </CountryProvider>
    </SessionProvider>
  );
}
