import { Text, Button } from "@react-email/components";
import EmailLayout from "./layout";

export default function VerifyEmail({ link }: { link: string }) {
    return (
        <EmailLayout>
            <Text style={{ fontSize: "22px", fontWeight: "bold" }}>
                Verify Your Email
            </Text>

            <Text>
                Click the button below to verify your MillionFlats account.
            </Text>

            <Button
                href={link}
                style={{
                    background: "#0a3a6a",
                    color: "#fff",
                    padding: "12px 24px",
                    borderRadius: "6px",
                }}
            >
                Verify Email
            </Button>
        </EmailLayout>
    );
}