import { Resend } from "resend";
import { config } from "./config";
import { Result } from "@/types/common/result";

const resend = new Resend(config.resendApiKey);

export async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<Result<unknown>> {
  const baseUrl =
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  if (!baseUrl) {
    throw new Error("Base URL is not defined. Set NEXTAUTH_URL or expose Vercel system environment variables.");
  }
  const verifyUrl = `${baseUrl}/verify?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: "Forum <registration@njutic.cloud>", // Replace with your verified domain
      to: [email],
      subject: "Verify your email address",
      html: `
        <p>Thanks for signing up!</p>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verifyUrl}">Verify Email</a>
      `,
    });

    if (error) {
      console.error("Error sending email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Exception sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
