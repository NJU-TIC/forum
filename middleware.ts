import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {},
  {
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: ["/profile", "/write-post", "/posts/:path*", "/api/:path*"],
};
