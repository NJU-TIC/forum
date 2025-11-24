import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";

type AppSession = Awaited<ReturnType<typeof getServerSession>>;

export type AuthenticatedUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin?: boolean;
};

/**
 * Retrieves the current NextAuth session on the server.
 */
export async function getServerAuthSession(): Promise<AppSession> {
  return getServerSession(authOptions);
}

/**
 * Ensures we have an authenticated user and returns their session payload.
 * Throws if the request is unauthenticated.
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as { id?: string }).id) {
    throw new Error("Authentication required");
  }

  return session.user as unknown as AuthenticatedUser;
}
