import { Text, Button, Section } from "@react-email/components";
import * as React from "react";
import EmailLayout, { brandColors } from "./layout";

interface AgentApprovalProps {
    name: string;
    dashboardLink?: string;
}

export default function AgentApproval({ name, dashboardLink }: AgentApprovalProps) {
    const href = dashboardLink || "https://millionflats.com/auth/agent/login";

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
                    ✅
                </div>
            </Section>

            <Text style={styles.heading}>Agent Account Approved!</Text>

            <Text style={styles.greeting}>Hi {name},</Text>

            <Text style={styles.body}>
                Great news! Your MillionFlats agent account has been reviewed and
                <strong> successfully approved</strong>.
            </Text>

            <Text style={styles.body}>
                You now have full access to the agent dashboard where you can:
            </Text>

            <Section style={styles.featureList}>
                <Text style={styles.featureItem}>
                    📋 &nbsp;List and manage property listings
                </Text>
                <Text style={styles.featureItem}>
                    📬 &nbsp;Receive and respond to buyer inquiries
                </Text>
                <Text style={styles.featureItem}>
                    📈 &nbsp;Track your listing performance
                </Text>
            </Section>

            <Section style={{ textAlign: "center" as const, margin: "28px 0 8px" }}>
                <Button href={href} style={styles.button}>
                    Go to Agent Dashboard
                </Button>
            </Section>

            <Text style={styles.disclaimer}>
                Welcome aboard! If you have any questions, our support team is always
                here to help.
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
        backgroundColor: "#16a34a",
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