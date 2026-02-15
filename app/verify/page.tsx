"use client";

import { useEffect, useState } from "react";
import { verifyUserAction } from "@/app/actions/auth";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState("Verification failed.");

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    verifyUserAction(token).then((result) => {
      if (cancelled) return;

      if (result.success) {
        setStatus("success");
        return;
      }

      setStatus("error");
      setErrorMessage(result.error || "Verification failed.");
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500">Invalid verification link.</div>
        <Link href="/signup" className="mt-4 text-blue-500 hover:underline">
          Go to Signup
        </Link>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-gray-500">Verifying email...</div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500">{errorMessage}</div>
        <Link href="/signup" className="mt-4 text-blue-500 hover:underline">
          Go to Signup
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Email Verified!</h1>
      <p className="mb-4">
        Your email has been successfully verified and your account is now active.
      </p>
      <Link href="/login" className="text-blue-500 hover:underline">
        Go to Login
      </Link>
    </div>
  );
}
