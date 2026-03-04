import { Text, Button } from "@react-email/components";
import EmailLayout from "./layout";

export default function PasswordReset({ link }: { link: string }) {
    return (
        <EmailLayout>
            <Text style={{ fontSize: "22px", fontWeight: "bold" }}>
                Reset Your Password
            </Text>

            <Text>
                We received a request to reset your password.
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
                Reset Password
            </Button>

            <Text>
                If you didn&apos;t request this, you can safely ignore this email.
            </Text>
        </EmailLayout>
    );
}