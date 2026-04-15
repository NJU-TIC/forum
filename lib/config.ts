import "server-only";
import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "config.json");

export interface Config {
  resendApiKey: string;
  allowedEmailSuffixes: string[];
  mongoDbUri: string;
  cosSecretId: string;
  cosSecretKey: string;
  cosBucket: string;
  cosRegion: string;
  cosPublicUrl: string;
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
  cosSecretId: configFile.cosSecretId || process.env.COS_SECRET_ID || "",
  cosSecretKey: configFile.cosSecretKey || process.env.COS_SECRET_KEY || "",
  cosBucket: configFile.cosBucket || process.env.COS_BUCKET || "",
  cosRegion: configFile.cosRegion || process.env.COS_REGION || "",
  cosPublicUrl: configFile.cosPublicUrl || process.env.COS_PUBLIC_URL || "",
};
