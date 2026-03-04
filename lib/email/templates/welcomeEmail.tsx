import { Text, Button } from "@react-email/components";
import EmailLayout from "./layout";

export default function WelcomeEmail({ name }: { name: string }) {
    return (
        <EmailLayout>
            <Text style={{ fontSize: "22px", fontWeight: "bold" }}>
                Welcome to MillionFlats
            </Text>

            <Text>
                Hi {name},
            </Text>

            <Text>
                Thank you for joining MillionFlats — your gateway to premium
                global real estate investments.
            </Text>

            <Button
                href="https://millionflats.com"
                style={{
                    background: "#0a3a6a",
                    color: "#fff",
                    padding: "12px 24px",
                    borderRadius: "6px",
                }}
            >
                Explore Properties
            </Button>
        </EmailLayout>
    );
}