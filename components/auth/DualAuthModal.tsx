"use client";

import React from "react";

export default function DualAuthModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose?: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Choose a sign-in method</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <p className="text-sm text-slate-600">
          This modal is temporarily placeholder-backed for build compatibility.
        </p>
      </div>
    </div>
  );
}
