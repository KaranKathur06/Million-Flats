import {
    Html,
    Head,
    Body,
    Container,
    Img,
    Section,
    Text,
} from "@react-email/components";

export default function EmailLayout({ children }: any) {
    return (
        <Html>
            <Head />
            <Body style={{ backgroundColor: "#f4f7fb", fontFamily: "Arial" }}>
                <Container
                    style={{
                        background: "#ffffff",
                        padding: "40px",
                        borderRadius: "8px",
                    }}
                >
                    <Section style={{ textAlign: "center", marginBottom: "20px" }}>
                        <Img
                            src="https://millionflats.com/logo.png"
                            width="140"
                            alt="MillionFlats"
                        />
                    </Section>

                    {children}

                    <Section style={{ marginTop: "40px" }}>
                        <Text style={{ color: "#888", fontSize: "12px" }}>
                            © {new Date().getFullYear()} MillionFlats Pvt Ltd
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}