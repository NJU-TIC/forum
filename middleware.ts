import { auth } from "@/auth";

export const middleware = auth;

export const config = {
  matcher: [
    "/profile",
    "/write-post",
    "/posts/:path*",
    "/api/:path*",
  ],
};
