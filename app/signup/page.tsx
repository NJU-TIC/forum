import { SignupForm } from "@/components/signup-form";
import { signupAction, getCurrentUser } from "@/app/actions/auth";
import { redirect } from "next/navigation";

export default async function SignupPage() {
  // Redirect if already logged in
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect("/");
  }
  async function handleSignup(formData: FormData) {
    "use server";
    const result = await signupAction(formData);
    return result;
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm action={handleSignup} />
      </div>
    </div>
  );
}
