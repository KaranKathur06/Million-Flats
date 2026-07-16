import { Text, Section, Link } from "@react-email/components";
import * as React from "react";
import EmailLayout, { brandColors } from "./layout";

interface VerificationLinkEmailProps {
  link: string;
  userName?: string;
  expires?: string;
}

export default function VerificationLinkEmail({ link, userName, expires = '24 hours' }: VerificationLinkEmailProps) {
  return (
    <EmailLayout>
      <Section style={{ textAlign: "center" as const, marginBottom: "20px" }}>
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
          🔗
        </div>
      </Section>

      <Text style={styles.heading}>Verify your email to continue</Text>

      <Text style={styles.greeting}>{userName ? `Hi ${userName},` : 'Hello,'}</Text>

      <Text style={styles.body}>
        Click the button below to verify your email address and finish setting up your MillionFlats account.
      </Text>

      <Section style={{ textAlign: 'center', margin: '18px 0' }}>
        <Link href={link} style={styles.cta}>
          Verify my email
        </Link>
      </Section>

      <Text style={styles.expiry}>This link expires in <strong>{expires}</strong>.</Text>

      <Text style={styles.disclaimer}>
        If the button does not work, copy and paste this link into your browser: {link}
      </Text>
    </EmailLayout>
  )
}

const styles = {
  heading: {
    fontSize: '22px',
    fontWeight: 700 as const,
    color: brandColors.textPrimary,
    textAlign: 'center' as const,
    margin: '0 0 10px'
  } as React.CSSProperties,
  greeting: {
    fontSize: '15px',
    color: brandColors.textPrimary,
    margin: '0 0 8px'
  } as React.CSSProperties,
  body: {
    fontSize: '15px',
    color: brandColors.textSecondary,
    margin: '0 0 16px'
  } as React.CSSProperties,
  cta: {
    display: 'inline-block',
    padding: '12px 20px',
    backgroundColor: brandColors.primary,
    color: '#fff',
    borderRadius: '6px',
    textDecoration: 'none'
  } as React.CSSProperties,
  expiry: {
    fontSize: '13px',
    color: brandColors.textSecondary,
    textAlign: 'center' as const,
    margin: '0 0 12px'
  } as React.CSSProperties,
  disclaimer: {
    fontSize: '12px',
    color: brandColors.textMuted,
    margin: '0',
    lineHeight: '1.4'
  } as React.CSSProperties,
}
