import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
    Img,
    Hr,
    Link,
} from "@react-email/components";
import * as React from "react";

const brandColors = {
    primary: "#0a3a6a",
    primaryLight: "#0d4e8f",
    accent: "#f5a623",
    dark: "#0f1726",
    cardBg: "#f8fafc",
    border: "#e2e8f0",
    textPrimary: "#1a202c",
    textSecondary: "#64748b",
    textMuted: "#94a3b8",
    white: "#ffffff",
    footerBg: "#f1f5f9",
};

export default function EmailLayout({ children }: { children: React.ReactNode }) {
    return (
        <Html>
            <Head>
                <meta name="color-scheme" content="light" />
                <meta name="supported-color-schemes" content="light" />
            </Head>
            <Body style={styles.body}>
                <Container style={styles.wrapper}>
                    {/* Header */}
                    <Section style={styles.header}>
                        <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%" }}>
                            <tr>
                                <td style={{ textAlign: "center", padding: "28px 0" }}>
                                    <Img
                                        src="https://millionflats.com/LOGO.jpeg"
                                        width="180"
                                        height="auto"
                                        alt="MillionFlats"
                                        style={{ display: "inline-block" }}
                                    />
                                </td>
                            </tr>
                        </table>
                    </Section>

                    {/* Content card */}
                    <Section style={styles.card}>
                        {children}
                    </Section>

                    {/* Footer */}
                    <Section style={styles.footer}>
                        <Hr style={styles.divider} />

                        <Text style={styles.footerBrand}>MillionFlats</Text>
                        <Text style={styles.footerText}>
                            Premium Global Real Estate Investments
                        </Text>

                        <Text style={styles.footerLinks}>
                            <Link href="https://millionflats.com" style={styles.footerLink}>
                                Website
                            </Link>
                            {" · "}
                            <Link href="https://millionflats.com/contact" style={styles.footerLink}>
                                Contact
                            </Link>
                            {" · "}
                            <Link href="https://millionflats.com/privacy" style={styles.footerLink}>
                                Privacy Policy
                            </Link>
                        </Text>

                        <Text style={styles.copyright}>
                            © {new Date().getFullYear()} MillionFlats Pvt Ltd. All rights reserved.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

const styles = {
    body: {
        backgroundColor: "#eef2f7",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        margin: "0",
        padding: "0",
    } as React.CSSProperties,

    wrapper: {
        maxWidth: "600px",
        margin: "0 auto",
        padding: "40px 20px",
    } as React.CSSProperties,

    header: {
        textAlign: "center" as const,
    } as React.CSSProperties,

    card: {
        backgroundColor: brandColors.white,
        borderRadius: "12px",
        padding: "40px 36px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04)",
        border: `1px solid ${brandColors.border}`,
    } as React.CSSProperties,

    footer: {
        padding: "24px 36px 0",
        textAlign: "center" as const,
    } as React.CSSProperties,

    divider: {
        borderColor: brandColors.border,
        borderWidth: "1px",
        margin: "0 0 20px",
    } as React.CSSProperties,

    footerBrand: {
        fontSize: "14px",
        fontWeight: "700" as const,
        color: brandColors.primary,
        margin: "0 0 2px",
        letterSpacing: "0.5px",
    } as React.CSSProperties,

    footerText: {
        fontSize: "12px",
        color: brandColors.textMuted,
        margin: "0 0 16px",
    } as React.CSSProperties,

    footerLinks: {
        fontSize: "12px",
        color: brandColors.textMuted,
        margin: "0 0 12px",
    } as React.CSSProperties,

    footerLink: {
        color: brandColors.textSecondary,
        textDecoration: "none",
    } as React.CSSProperties,

    copyright: {
        fontSize: "11px",
        color: brandColors.textMuted,
        margin: "0",
    } as React.CSSProperties,
};

// Export brand colors for use in other templates
export { brandColors };