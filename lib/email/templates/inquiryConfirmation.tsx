import { Text } from "@react-email/components";
import EmailLayout from "./layout";

export default function InquiryConfirmation({
    property,
}: {
    property: string;
}) {
    return (
        <EmailLayout>
            <Text style={{ fontSize: "22px", fontWeight: "bold" }}>
                Inquiry Received
            </Text>

            <Text>
                Thank you for your interest in:
            </Text>

            <Text style={{ fontWeight: "bold" }}>{property}</Text>

            <Text>
                A verified MillionFlats agent will contact you shortly.
            </Text>
        </EmailLayout>
    );
}