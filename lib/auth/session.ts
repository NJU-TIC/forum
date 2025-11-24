import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";

type AppSession = Awaited<ReturnType<typeof getServerSession>>;

export type AuthenticatedUser = NonNullable<NonNullable<AppSession>["user"]> & {
  id: string;
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

  if (!session?.user?.id) {
    throw new Error("Authentication required");
  }

  return session.user as AuthenticatedUser;
}
