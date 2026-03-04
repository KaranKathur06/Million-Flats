import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, react: any) {
    await resend.emails.send({
        from: "MillionFlats <support@millionflats.com>",
        to,
        subject,
        react,
    });
}