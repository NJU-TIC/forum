import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware() {},
  {
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  // Protect only private pages. Do not guard /api/auth/* here.
  matcher: ["/profile", "/write-post", "/posts/:path*/edit"],
};
