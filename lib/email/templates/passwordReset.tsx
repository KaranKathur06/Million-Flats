import { Text, Button, Section } from "@react-email/components";
import * as React from "react";
import EmailLayout, { brandColors } from "./layout";

interface PasswordResetProps {
    link: string;
    userName?: string;
}

export default function PasswordReset({ link, userName }: PasswordResetProps) {
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
                        backgroundColor: "#fef3c7",
                        fontSize: "24px",
                        textAlign: "center" as const,
                    }}
                >
                    🔑
                </div>
            </Section>

            <Text style={styles.heading}>Reset Your Password</Text>

            <Text style={styles.greeting}>
                {userName ? `Hi ${userName},` : "Hi there,"}
            </Text>

            <Text style={styles.body}>
                We received a request to reset your MillionFlats account password.
                Click the button below to set a new password.
            </Text>

            <Section style={{ textAlign: "center" as const, margin: "28px 0" }}>
                <Button href={link} style={styles.button}>
                    Reset Password
                </Button>
            </Section>

            <Text style={styles.expiry}>
                ⏱ This link expires in <strong>20 minutes</strong>
            </Text>

            <Text style={styles.linkFallback}>
                If the button doesn&apos;t work, copy and paste this link:
            </Text>
            <Text style={styles.linkUrl}>{link}</Text>

            <Text style={styles.disclaimer}>
                If you didn&apos;t request a password reset, no action is needed — your
                account is safe.
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

    expiry: {
        fontSize: "13px",
        color: brandColors.textSecondary,
        textAlign: "center" as const,
        margin: "0 0 20px",
    } as React.CSSProperties,

    linkFallback: {
        fontSize: "12px",
        color: brandColors.textMuted,
        margin: "0 0 4px",
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