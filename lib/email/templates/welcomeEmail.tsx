import { Text, Button, Section } from "@react-email/components";
import * as React from "react";
import EmailLayout, { brandColors } from "./layout";

interface WelcomeEmailProps {
    name: string;
}

export default function WelcomeEmail({ name }: WelcomeEmailProps) {
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
                        backgroundColor: "#eff6ff",
                        fontSize: "24px",
                        textAlign: "center" as const,
                    }}
                >
                    🏠
                </div>
            </Section>

            <Text style={styles.heading}>Welcome to MillionFlats</Text>

            <Text style={styles.greeting}>Hi {name},</Text>

            <Text style={styles.body}>
                Thank you for joining MillionFlats — your gateway to premium global
                real estate investments. We&apos;re thrilled to have you on board.
            </Text>

            <Text style={styles.body}>Here&apos;s what you can do next:</Text>

            {/* Feature list */}
            <Section style={styles.featureList}>
                <Text style={styles.featureItem}>
                    🏢 &nbsp;Browse verified premium property listings
                </Text>
                <Text style={styles.featureItem}>
                    📊 &nbsp;Access market analysis and investment insights
                </Text>
                <Text style={styles.featureItem}>
                    🤝 &nbsp;Connect with certified real estate agents
                </Text>
            </Section>

            <Section style={{ textAlign: "center" as const, margin: "28px 0 8px" }}>
                <Button href="https://millionflats.com" style={styles.button}>
                    Explore Properties
                </Button>
            </Section>

            <Text style={styles.disclaimer}>
                Need help? Reply to this email or visit our{" "}
                <a href="https://millionflats.com/contact" style={{ color: brandColors.primary }}>
                    support page
                </a>
                .
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
        margin: "0 0 8px",
        lineHeight: "1.6",
    } as React.CSSProperties,

    featureList: {
        margin: "16px 0 8px",
        padding: "16px 20px",
        backgroundColor: "#f8fafc",
        borderRadius: "10px",
        border: `1px solid ${brandColors.border}`,
    } as React.CSSProperties,

    featureItem: {
        fontSize: "14px",
        color: brandColors.textPrimary,
        margin: "0 0 8px",
        lineHeight: "1.5",
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

    disclaimer: {
        fontSize: "12px",
        color: brandColors.textMuted,
        margin: "0",
        lineHeight: "1.5",
        borderTop: `1px solid ${brandColors.border}`,
        paddingTop: "16px",
    } as React.CSSProperties,
};