"use server";

import { updateUserNameById } from "@/lib/db";
import { requireAuthenticatedUser } from "@/lib/auth/session";

// Server action: update current user's username with basic validation and uniqueness check.
export async function updateUsernameAction(formData: FormData) {
  const currentUser = await requireAuthenticatedUser().catch(() => null);

  if (!currentUser?.id) {
    return { error: "Not signed in; cannot update username" };
  }

  const rawName = (formData.get("username") as string) || "";
  const username = rawName.trim();

  if (!username) {
    return { error: "Username cannot be empty" };
  }
  if (username.length < 3 || username.length > 30) {
    return { error: "Username must be between 3 and 30 characters" };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { error: "Username can only contain letters, numbers, underscores, and hyphens" };
  }

  try {
    const updatedUser = await updateUserNameById(currentUser.id, username);
    if (!updatedUser) {
      return { error: "Update failed; try again" };
    }

    return {
      success: true,
      name: updatedUser.name,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Update failed; try again";
    return { error: message };
  }
}
