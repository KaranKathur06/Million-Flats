import { Text, Section } from "@react-email/components";
import * as React from "react";
import EmailLayout, { brandColors } from "./layout";

interface InquiryConfirmationProps {
    property: string;
    buyerName?: string;
}

export default function InquiryConfirmation({
    property,
    buyerName,
}: InquiryConfirmationProps) {
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
                    📩
                </div>
            </Section>

            <Text style={styles.heading}>Inquiry Received</Text>

            <Text style={styles.greeting}>
                {buyerName ? `Hi ${buyerName},` : "Hi there,"}
            </Text>

            <Text style={styles.body}>
                Thank you for your interest! We&apos;ve received your inquiry for the
                following property:
            </Text>

            {/* Property card */}
            <Section style={styles.propertyCard}>
                <Text style={styles.propertyName}>{property}</Text>
            </Section>

            <Text style={styles.body}>
                A verified MillionFlats agent will review your inquiry and contact you
                shortly. You can expect a response within <strong>24 hours</strong>.
            </Text>

            <Text style={styles.disclaimer}>
                In the meantime, feel free to browse more listings at{" "}
                <a href="https://millionflats.com" style={{ color: brandColors.primary }}>
                    millionflats.com
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
        margin: "0 0 16px",
        lineHeight: "1.6",
    } as React.CSSProperties,

    propertyCard: {
        margin: "0 0 24px",
        padding: "20px",
        backgroundColor: "#f8fafc",
        borderRadius: "10px",
        border: `1px solid ${brandColors.border}`,
        borderLeft: `4px solid ${brandColors.primary}`,
        textAlign: "center" as const,
    } as React.CSSProperties,

    propertyName: {
        fontSize: "16px",
        fontWeight: "700" as const,
        color: brandColors.textPrimary,
        margin: "0",
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