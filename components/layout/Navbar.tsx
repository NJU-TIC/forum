"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { User, Menu, Search, FileText, LogOut, PenSquare } from "lucide-react";

// Reusable navigation link component
const NavLink = ({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <NavigationMenuItem>
    <NavigationMenuLink
      asChild
      className={`group inline-flex h-9 w-max items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-active:bg-accent/50 data-state-open:bg-accent/50 ${className}`}
    >
      <Link href={href}>{children}</Link>
    </NavigationMenuLink>
  </NavigationMenuItem>
);

// Title component
const TitleLink = () => (
  <NavigationMenuItem>
    <NavigationMenuLink
      asChild
      className="group inline-flex h-9 w-max items-center justify-center rounded-md px-3 py-2 text-sm font-bold transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-active:bg-accent/50 data-state-open:bg-accent/50"
    >
      <Link href="/">
        <span className="text-primary">NJUTIC</span>
        <span className="ml-1 font-semibold">Forum</span>
      </Link>
    </NavigationMenuLink>
  </NavigationMenuItem>
);

// Navigation content (shared between mobile and desktop)
const NavigationContent = ({ isMobile = false }: { isMobile?: boolean }) => (
  <NavigationMenuList
    className={isMobile ? "flex-col items-start gap-1" : "gap-1"}
  >
    {isMobile ? (
      <>
        <TitleLink />
        <div className="border-t border-border/40 my-1"></div>
        <NavLink href="/posts">
          <FileText className="mr-2 h-4 w-4" />
          Posts
        </NavLink>
        <NavLink href="/write-post">
          <PenSquare className="mr-2 h-4 w-4" />
          Write Post
        </NavLink>
        <NavLink href="/search">
          <Search className="mr-2 h-4 w-4" />
          Search
        </NavLink>
      </>
    ) : (
      <>
        <TitleLink />
        <div className="w-px h-6 bg-border/40 mx-1"></div>
        <NavLink href="/posts">
          <FileText className="mr-2 h-4 w-4" />
          Posts
        </NavLink>
        <NavLink href="/write-post">
          <PenSquare className="mr-2 h-4 w-4" />
          Write Post
        </NavLink>
        <NavLink href="/search">
          <Search className="mr-2 h-4 w-4" />
          Search
        </NavLink>
      </>
    )}
  </NavigationMenuList>
);

export function Navbar() {
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLElement>(null);
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated" && !!session?.user;

  useEffect(() => {
    const checkWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setIsMobile(width < 768);
      }
    };

    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  async function handleLogout() {
    await signOut({ redirect: false });
    router.refresh();
    router.push("/");
  }

  return (
    <header
      ref={containerRef}
      className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
    >
      <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-4 px-4 md:px-6 **:no-underline">
        {/* Left side - Navigation */}
        <div className="flex items-center gap-2">
          {/* Mobile menu trigger */}
          {isMobile && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  className="group h-9 w-9 hover:bg-accent hover:text-accent-foreground"
                  variant="ghost"
                  size="icon"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-48 p-2" sideOffset={8}>
                <NavigationMenu className="max-w-none">
                  <NavigationContent isMobile={true} />
                </NavigationMenu>
              </PopoverContent>
            </Popover>
          )}

          {/* Desktop Navigation */}
          {!isMobile && (
            <NavigationMenu>
              <NavigationContent isMobile={false} />
            </NavigationMenu>
          )}
        </div>

        {/* Right side - Auth/User Menu */}
        <div className="flex items-center gap-3">
          {!isLoggedIn ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-sm font-medium hover:bg-accent/50"
                onClick={() => router.push("/login")}
              >
                Log in
              </Button>
              <Button
                size="sm"
                className="text-sm font-medium px-4 h-9 rounded-md shadow-sm transition-colors hover:bg-primary/90"
                onClick={() => router.push("/signup")}
              >
                Sign up
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-accent/50"
              >
                <User className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-sm font-medium hover:bg-accent/50"
                onClick={() => router.push("/profile")}
              >
                Profile
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-sm font-medium hover:bg-accent/50"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-1" />
                Log out
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
