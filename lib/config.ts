import "server-only";
import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "config.json");

export interface Config {
  resendApiKey: string;
  allowedEmailSuffixes: string[];
  mongoDbUri: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
}

let configFile: Partial<Config> = {};
try {
  const fileContent = fs.readFileSync(configPath, "utf-8");
  configFile = JSON.parse(fileContent) as Config;
} catch {
  // config.json not found, will fall back to environment variables
}

export const config: Config = {
  resendApiKey: process.env.RESEND_API_KEY || configFile.resendApiKey || "",
  allowedEmailSuffixes:
    process.env.ALLOWED_EMAIL_SUFFIXES?.split(",") ||
    configFile.allowedEmailSuffixes ||
    [],
  mongoDbUri: process.env.MONGODB_URI || configFile.mongoDbUri || "",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || configFile.vapidPublicKey || "",
  vapidPrivateKey:
    process.env.VAPID_PRIVATE_KEY || configFile.vapidPrivateKey || "",
  vapidSubject: process.env.VAPID_SUBJECT || configFile.vapidSubject || "",
};
