"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

interface ProvidersProps {
  children: React.ReactNode;
  session: Session | null;
}

/**
 * Wraps the client subtree with NextAuth's SessionProvider.
 * Use this in the root layout to avoid React context usage inside server components.
 */
export function Providers({ children, session }: ProvidersProps) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
