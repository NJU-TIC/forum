import "server-only";
import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "config.json");

export interface Config {
  resendApiKey: string;
  allowedEmailSuffixes: string[];
  mongoDbUri: string;
}

let configFile: Partial<Config> = {};
try {
  const fileContent = fs.readFileSync(configPath, "utf-8");
  configFile = JSON.parse(fileContent) as Config;
} catch {
  // config.json not found, will fall back to environment variables
}

export const config: Config = {
  resendApiKey: configFile.resendApiKey || process.env.RESEND_API_KEY || "",
  allowedEmailSuffixes:
    configFile.allowedEmailSuffixes ||
    (process.env.ALLOWED_EMAIL_SUFFIXES?.split(",") ?? []),
  mongoDbUri: configFile.mongoDbUri || process.env.MONGODB_URI || "",
};
