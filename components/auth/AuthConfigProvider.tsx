"use client";

import React, { createContext, useContext, useMemo } from "react";

export type AuthMode =
  | "WHATSAPP_ONLY"
  | "EMAIL_ONLY"
  | "EMAIL_AND_WHATSAPP"
  | "DISABLED";

export interface AuthConfigContextValue {
  activeMode: AuthMode;
  setActiveMode?: (mode: AuthMode) => void;
}

const defaultAuthConfig: AuthConfigContextValue = {
  activeMode: "DISABLED",
  setActiveMode: undefined,
};

const AuthConfigContext = createContext<AuthConfigContextValue>(defaultAuthConfig);

export default function AuthConfigProvider({
  children,
  initialMode = "DISABLED",
}: {
  children: React.ReactNode;
  initialMode?: AuthMode;
}) {
  const value = useMemo<AuthConfigContextValue>(
    () => ({
      activeMode: initialMode,
      setActiveMode: undefined,
    }),
    [initialMode],
  );

  return <AuthConfigContext.Provider value={value}>{children}</AuthConfigContext.Provider>;
}

export function useAuthConfig() {
  return useContext(AuthConfigContext);
}
