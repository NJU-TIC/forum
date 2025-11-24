import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/options";

const authHandler = NextAuth(authOptions);

export const { handlers, auth, signIn, signOut } = authHandler;
export { authHandler as handler, authOptions };
