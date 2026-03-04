import { Text, Button, Section } from "@react-email/components";
import * as React from "react";
import EmailLayout, { brandColors } from "./layout";

interface VerifyEmailProps {
    link: string;
    userName?: string;
}

export default function VerifyEmail({ link, userName }: VerifyEmailProps) {
    return (
        <EmailLayout>
            <Section style={{ textAlign: "center" as const, marginBottom: "24px" }}>
                <div
                    style={{
                        display: "inline-block",
                        width: "56px",
                        height: "56px",
                        lineHeight: "56px",
                        borderRadius: "50%",
                        backgroundColor: "#f0fdf4",
                        fontSize: "24px",
                        textAlign: "center" as const,
                    }}
                >
                    ✉️
                </div>
            </Section>

            <Text style={styles.heading}>Verify Your Email</Text>

            <Text style={styles.greeting}>
                {userName ? `Hi ${userName},` : "Hi there,"}
            </Text>

            <Text style={styles.body}>
                Thank you for signing up with MillionFlats! Please verify your email
                address by clicking the button below.
            </Text>

            <Section style={{ textAlign: "center" as const, margin: "28px 0" }}>
                <Button href={link} style={styles.button}>
                    Verify Email Address
                </Button>
            </Section>

            <Text style={styles.linkFallback}>
                If the button doesn&apos;t work, copy and paste this link into your browser:
            </Text>
            <Text style={styles.linkUrl}>{link}</Text>

            <Text style={styles.disclaimer}>
                If you didn&apos;t create a MillionFlats account, you can safely ignore
                this email.
            </Text>
        </EmailLayout>
    );
}

const styles = {
    heading: {
        fontSize: "22px",
        fontWeight: "700" as const,
        color: brandColors.textPrimary,
        textAlign: "center" as const,
        margin: "0 0 20px",
        lineHeight: "1.3",
    } as React.CSSProperties,

    greeting: {
        fontSize: "15px",
        color: brandColors.textPrimary,
        margin: "0 0 8px",
        lineHeight: "1.5",
    } as React.CSSProperties,

    body: {
        fontSize: "15px",
        color: brandColors.textSecondary,
        margin: "0 0 4px",
        lineHeight: "1.6",
    } as React.CSSProperties,

    button: {
        backgroundColor: brandColors.primary,
        color: brandColors.white,
        fontSize: "15px",
        fontWeight: "600" as const,
        padding: "14px 32px",
        borderRadius: "8px",
        textDecoration: "none",
        display: "inline-block",
    } as React.CSSProperties,

    linkFallback: {
        fontSize: "12px",
        color: brandColors.textMuted,
        margin: "24px 0 4px",
        lineHeight: "1.4",
    } as React.CSSProperties,

    linkUrl: {
        fontSize: "12px",
        color: brandColors.primaryLight,
        margin: "0 0 24px",
        wordBreak: "break-all" as const,
        lineHeight: "1.4",
    } as React.CSSProperties,

    disclaimer: {
        fontSize: "12px",
        color: brandColors.textMuted,
        margin: "0",
        lineHeight: "1.5",
        borderTop: `1px solid ${brandColors.border}`,
        paddingTop: "16px",
    } as React.CSSProperties,
};