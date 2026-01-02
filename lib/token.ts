import { SignJWT, jwtVerify } from "jose";
import { Credentials } from "@/schema/user";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET is not defined");
}

const SECRET_KEY = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
const ALG = "HS256";

export interface RegistrationPayload {
  name: string;
  email: string;
  credentials: Credentials;
}

export async function createRegistrationToken(
  payload: RegistrationPayload,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET_KEY);
}

export async function verifyRegistrationToken(
  token: string,
): Promise<RegistrationPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    // Cast payload to our type, checking for required fields roughly
    if (payload.name && payload.email && payload.credentials) {
      return payload as unknown as RegistrationPayload;
    }
    return null;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}
