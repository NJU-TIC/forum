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

import { Result } from "@/types/common/result";

export function SignupForm({
  action,
  ...props
}: React.ComponentProps<typeof Card> & {
  action: (formData: FormData) => Promise<Result<{ shouldSignIn: boolean; message: string }>>;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleAction(formData: FormData) {
    setIsLoading(true);
    const result = await action(formData);

    if (!result.success) {
      toast.error("注册失败", {
        description: result.error,
      });
    } else {
      if (result.data.message) {
        toast.success("注册成功", {
          description: result.data.message,
        });
      }

      // If shouldSignIn is true, sign in the user on the client side
      if (result.data.shouldSignIn) {
        const signInResult = await signIn("credentials", {
          username: formData.get("username") as string,
          password: formData.get("password") as string,
          redirect: false,
        });

        if (signInResult?.error) {
          toast.error("登录失败", {
            description: "账号已创建，但自动登录失败。请尝试手动登录。",
          });
        }
        router.push("/");
      } else {
        // Just redirect to login or stay on page if message is shown
        // In this case, since we showed a message (check email), maybe we redirect to login after a delay
        // or just let them read the toast.
        // Let's redirect to login for now so they know where to go next.
        // Or better, redirect to a page that says "Check your email"
        // But for now, login page is fine.
        router.push("/login");
      }
    }
    setIsLoading(false);
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>创建账号</CardTitle>
        <CardDescription>
          在下方输入您的信息以创建账号。
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
                您在论坛中的唯一用户名。
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="email">电子邮箱</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
              <FieldDescription>
                我们将通过此邮箱与您联系。我们不会将您的邮箱分享给任何人。
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">密码</FieldLabel>
              <Input id="password" name="password" type="password" required />
              <FieldDescription>
                长度至少为8个字符。
              </FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "正在创建···" : "创建账号"}
                </Button>
                <FieldDescription className="px-6 text-center">
                  已有帐号？ <a href="/login">立即登录</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
