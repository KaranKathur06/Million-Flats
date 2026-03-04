import { Text, Button } from "@react-email/components";
import EmailLayout from "./layout";

export default function AgentApproval({ name }: { name: string }) {
    return (
        <EmailLayout>
            <Text style={{ fontSize: "22px", fontWeight: "bold" }}>
                Agent Account Approved
            </Text>

            <Text>
                Hi {name},
            </Text>

            <Text>
                Your MillionFlats agent account has been successfully approved.
            </Text>

            <Button
                href="https://millionflats.com/auth/agent/login"
                style={{
                    background: "#0a3a6a",
                    color: "#fff",
                    padding: "12px 24px",
                    borderRadius: "6px",
                }}
            >
                Login to Dashboard
            </Button>
        </EmailLayout>
    );
}