import { Text, Section } from "@react-email/components";
import * as React from "react";
import EmailLayout, { brandColors } from "./layout";

interface OTPEmailProps {
    otp: string;
    userName?: string;
}

export default function OTPEmail({ otp, userName }: OTPEmailProps) {
    return (
        <EmailLayout>
            {/* Icon circle */}
            <Section style={{ textAlign: "center" as const, marginBottom: "24px" }}>
                <div
                    style={{
                        display: "inline-block",
                        width: "56px",
                        height: "56px",
                        lineHeight: "56px",
                        borderRadius: "50%",
                        backgroundColor: "#eff6ff",
                        fontSize: "24px",
                        textAlign: "center" as const,
                    }}
                >
                    🔐
                </div>
            </Section>

            <Text style={styles.heading}>Verify Your Login</Text>

            <Text style={styles.greeting}>
                {userName ? `Hi ${userName},` : "Hi there,"}
            </Text>

            <Text style={styles.body}>
                Use the verification code below to complete your login to MillionFlats.
            </Text>

            {/* OTP Code Box */}
            <Section style={styles.otpContainer}>
                <Text style={styles.otpCode}>{otp}</Text>
            </Section>

            <Text style={styles.expiry}>
                ⏱ This code expires in <strong>10 minutes</strong>
            </Text>

            <Text style={styles.disclaimer}>
                If you did not request this code, please ignore this email or contact
                our support team.
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
        margin: "0 0 28px",
        lineHeight: "1.6",
    } as React.CSSProperties,

    otpContainer: {
        textAlign: "center" as const,
        margin: "0 0 20px",
        padding: "24px",
        backgroundColor: "#f8fafc",
        borderRadius: "10px",
        border: `2px dashed ${brandColors.border}`,
    } as React.CSSProperties,

    otpCode: {
        fontSize: "36px",
        fontWeight: "800" as const,
        letterSpacing: "10px",
        color: brandColors.primary,
        margin: "0",
        fontFamily: '"Courier New", monospace',
    } as React.CSSProperties,

    expiry: {
        fontSize: "13px",
        color: brandColors.textSecondary,
        textAlign: "center" as const,
        margin: "0 0 24px",
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