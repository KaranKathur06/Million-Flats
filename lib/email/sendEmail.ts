import { Resend } from "resend";
import * as React from "react";

// ---------- Resend client (singleton) ----------
const resend = new Resend(process.env.RESEND_API_KEY);

// ---------- Helpers ----------
function safeString(v: unknown) {
    return typeof v === "string" ? v.trim() : "";
}

function getBaseUrl() {
    const base = safeString(
        process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL
    );
    return base ? base.replace(/\/$/, "") : "http://localhost:3000";
}

/** Build a full URL from a relative pathname */
export function buildAbsoluteUrl(pathname: string) {
    const base = getBaseUrl();
    const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
    return `${base}${path}`;
}

// ---------- Send Email ----------
type SendEmailInput = {
    to: string;
    subject: string;
} & (
        | { react: React.ReactElement; html?: never; text?: never }
        | { html: string; react?: never; text?: never }
        | { text: string; react?: never; html?: never }
    );

/**
 * Unified email sending gateway via Resend.
 * Supports React Email components, raw HTML, or plain text.
 */
export async function sendEmail(input: SendEmailInput) {
    const from =
        safeString(process.env.EMAIL_FROM) ||
        "MillionFlats <support@millionflats.com>";

    try {
        const payload: any = {
            from,
            to: input.to,
            subject: input.subject,
        };

        if ("react" in input && input.react) {
            payload.react = input.react;
        } else if ("html" in input && input.html) {
            payload.html = input.html;
        } else if ("text" in input && input.text) {
            payload.text = input.text;
        }

        const result = await resend.emails.send(payload);

        console.log("EMAIL_SENT", {
            type: "react" in input && input.react ? "react" : "html" in input && input.html ? "html" : "text",
            to: input.to,
            subject: input.subject,
            id: (result as any)?.data?.id || null,
        });

        return { ok: true as const, id: (result as any)?.data?.id || null };
    } catch (error) {
        console.error("EMAIL_FAILED", {
            to: input.to,
            subject: input.subject,
            error,
        });

        return { ok: false as const, error };
    }
}

// ---------- Ecosystem lead email formatter (migrated from lib/email.ts) ----------
export function formatEcosystemLeadEmail(params: {
    categorySlug: string;
    partnerId?: string | null;
    name: string;
    email: string;
    phone: string;
    message: string;
    source?: string | null;
    leadId: string;
}) {
    const lines = [
        `New Ecosystem Lead`,
        "",
        `Lead ID: ${params.leadId}`,
        `Category: ${params.categorySlug}`,
        `Partner ID: ${params.partnerId || "N/A"}`,
        `Name: ${params.name}`,
        `Email: ${params.email}`,
        `Phone: ${params.phone}`,
        `Source: ${params.source || "N/A"}`,
        "",
        `Message:`,
        params.message,
    ];

    return {
        subject: `New Ecosystem Lead: ${params.categorySlug}`,
        text: lines.join("\n"),
    };
}