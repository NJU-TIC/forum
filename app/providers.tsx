"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { NewPostNotifier } from "@/components/notifications/new-post-notifier";

interface ProvidersProps {
  children: React.ReactNode;
  session: Session | null;
}

/**
 * Wraps the client subtree with NextAuth's SessionProvider.
 * Use this in the root layout to avoid React context usage inside server components.
 */
export function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <NewPostNotifier />
      {children}
      <Toaster />
    </SessionProvider>
  );
}
