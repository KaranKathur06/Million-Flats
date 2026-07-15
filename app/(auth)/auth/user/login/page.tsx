"use client";

import { Suspense } from "react";
import AuthUserLoginClient from "./AuthUserLoginClient";

export default function AuthUserLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <AuthUserLoginClient />
    </Suspense>
  );
}
