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
