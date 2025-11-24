"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SignupForm({
  action,
  ...props
}: React.ComponentProps<typeof Card> & {
  action: (formData: FormData) => Promise<{
    success?: boolean;
    error?: string;
    user?: unknown;
    shouldSignIn?: boolean;
  }>;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleAction(formData: FormData) {
    setIsLoading(true);
    const result = await action(formData);

    if (result.error) {
      alert(result.error);
    } else if (result.success) {
      // If shouldSignIn is true, sign in the user on the client side
      if (result.shouldSignIn) {
        const signInResult = await signIn("credentials", {
          username: formData.get("username") as string,
          password: formData.get("password") as string,
          redirect: false,
        });

        if (signInResult?.error) {
          alert(
            "Account created but sign-in failed. Please try signing in manually.",
          );
        }
      }
      router.push("/");
    }
    setIsLoading(false);
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="johndoe"
                required
              />
              <FieldDescription>
                Your unique username for the forum.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
              <FieldDescription>
                We&apos;ll use this to contact you. We will not share your email
                with anyone else.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" name="password" type="password" required />
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
                <FieldDescription className="px-6 text-center">
                  Already have an account? <a href="/login">Sign in</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
