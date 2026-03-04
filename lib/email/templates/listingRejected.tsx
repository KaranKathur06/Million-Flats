import { Text, Button, Section } from "@react-email/components";
import * as React from "react";
import EmailLayout, { brandColors } from "./layout";

interface ListingRejectedProps {
    agentName: string;
    title: string;
    reason: string;
    dashboardLink: string;
}

export default function ListingRejected({
    agentName,
    title,
    reason,
    dashboardLink,
}: ListingRejectedProps) {
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
                        backgroundColor: "#fef2f2",
                        fontSize: "24px",
                        textAlign: "center" as const,
                    }}
                >
                    ❌
                </div>
            </Section>

            <Text style={styles.heading}>Listing Rejected</Text>

            <Text style={styles.greeting}>Hi {agentName},</Text>

            <Text style={styles.body}>
                Your listing <strong>{title}</strong> has been reviewed and was not
                approved by our moderation team.
            </Text>

            {/* Reason card */}
            <Section style={styles.reasonCard}>
                <Text style={styles.reasonLabel}>Reason for rejection</Text>
                <Text style={styles.reasonText}>{reason}</Text>
            </Section>

            <Text style={styles.body}>
                You can review the feedback, make the necessary changes, and resubmit
                your listing from your agent dashboard.
            </Text>

            <Section style={{ textAlign: "center" as const, margin: "28px 0 8px" }}>
                <Button href={dashboardLink} style={styles.button}>
                    Go to Dashboard
                </Button>
            </Section>

            <Text style={styles.disclaimer}>
                If you have questions about this decision, please contact our support
                team.
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

    reasonCard: {
        margin: "16px 0 24px",
        padding: "20px",
        backgroundColor: "#fef2f2",
        borderRadius: "10px",
        border: "1px solid #fecaca",
        borderLeft: "4px solid #ef4444",
    } as React.CSSProperties,

    reasonLabel: {
        fontSize: "11px",
        fontWeight: "700" as const,
        textTransform: "uppercase" as const,
        letterSpacing: "0.5px",
        color: "#991b1b",
        margin: "0 0 6px",
    } as React.CSSProperties,

    reasonText: {
        fontSize: "14px",
        color: "#7f1d1d",
        margin: "0",
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
