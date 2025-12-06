"use client";

import { useState, useTransition } from "react";
import { updateUsernameAction } from "@/app/actions/profile";

interface UsernameFormProps {
  initialName: string;
  // Optional callback to bubble updated name to parent (e.g., close modal/update header).
  onSuccess?: (name: string) => void;
}

export function UsernameForm({ initialName, onSuccess }: UsernameFormProps) {
  const [username, setUsername] = useState(initialName);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateUsernameAction(formData);
      if (result?.error) {
        setMessage(result.error);
        return;
      }
      if (result?.success && result.name) {
        setMessage("Username updated");
        setUsername(result.name);
        // Notify parent so it can sync UI or close dialog.
        onSuccess?.(result.name);
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter new username"
          disabled={isPending}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save username"}
        </button>
        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>
    </form>
  );
}
