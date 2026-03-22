"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
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

export function LoginForm({
  action,
  ...props
}: React.ComponentProps<typeof Card> & {
  action: (formData: FormData) => Promise<{
    success?: boolean;
    error?: string;
    user?: unknown;
    credentials?: { username: string; password: string };
  }>;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleAction(formData: FormData) {
    setIsLoading(true);
    const result = await action(formData);

    if (result.error) {
      toast.error("登录失败", {
        description: result.error,
      });
    } else if (result.success) {
      // If credentials are provided, sign in on the client side
      if (result.credentials) {
        const signInResult = await signIn("credentials", {
          username: result.credentials.username,
          password: result.credentials.password,
          redirect: false,
        });

        if (signInResult?.error) {
          // Show the actual error message if available, otherwise a generic one
          toast.error("登录失败", {
            description: signInResult.error || "请稍后重试。",
          });
          return;
        }
      }
      toast.success("欢迎回来！", {
        description: "您已成功登录。",
      });
      router.push("/");
    }
    setIsLoading(false);
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>欢迎回来</CardTitle>
        <CardDescription>
          请输入您的用户名和密码以登录账户。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleAction}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="username">用户名</FieldLabel>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="johndoe"
                required
              />
              <FieldDescription>
                请输入您的用户名和密码以登录账户。
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">密码</FieldLabel>
              <Input id="password" name="password" type="password" required />
              <FieldDescription>
                输入您的密码以访问账户。
              </FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "登录中..." : "登录"}
                </Button>
                <FieldDescription className="px-6 text-center">
                  还没有账号？ <a href="/signup">立即注册</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
