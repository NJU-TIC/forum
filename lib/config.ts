import "server-only";
import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "config.json");

export interface Config {
  resendApiKey: string;
  allowedEmailSuffixes: string[];
  mongoDbUri: string;
}

let configFile: Config;
try {
  const fileContent = fs.readFileSync(configPath, "utf-8");
  configFile = JSON.parse(fileContent) as Config;
} catch (error) {
  console.error(`Error loading config from ${configPath}:`, error);
  throw new Error(
    "Failed to load config.json. Please ensure it exists in the root directory.",
  );
}

export const config: Config = {
  resendApiKey: configFile.resendApiKey,
  allowedEmailSuffixes: configFile.allowedEmailSuffixes,
  mongoDbUri: configFile.mongoDbUri,
};
