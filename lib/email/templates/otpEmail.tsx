import { Text, Section } from "@react-email/components";
import EmailLayout from "./layout";

export default function OTPEmail({ otp }: { otp: string }) {
    return (
        <EmailLayout>
            <Text style={{ fontSize: "22px", fontWeight: "bold" }}>
                Verify Your Login
            </Text>

            <Text>
                Your MillionFlats verification code is:
            </Text>

            <Section
                style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    letterSpacing: "8px",
                    textAlign: "center",
                    margin: "30px 0",
                    color: "#0a3a6a",
                }}
            >
                {otp}
            </Section>

            <Text>This code expires in 10 minutes.</Text>
        </EmailLayout>
    );
}