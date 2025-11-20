import { LoginForm } from "@/components/login-form";
import { loginAction, getCurrentUser } from "@/app/actions/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  // Redirect if already logged in
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect("/");
  }
  async function handleLogin(formData: FormData) {
    "use server";
    const result = await loginAction(formData);
    return result;
  }
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm action={handleLogin} />
      </div>
    </div>
  );
}
