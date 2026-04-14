import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import {
  upsertPushSubscription,
  validatePushSubscriptionPayload,
} from "@/lib/db/push-subscriptions";
import { isWebPushEnabled } from "@/lib/web-push";

export async function POST(request: Request) {
  if (!isWebPushEnabled()) {
    return NextResponse.json(
      { success: false, error: "Web push is not configured" },
      { status: 503 },
    );
  }

  const currentUser = await requireAuthenticatedUser().catch(() => null);
  if (!currentUser) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const subscription = validatePushSubscriptionPayload(body);

  if (!subscription) {
    return NextResponse.json(
      { success: false, error: "Invalid push subscription payload" },
      { status: 400 },
    );
  }

  await upsertPushSubscription(currentUser.id, subscription);

  return NextResponse.json(
    { success: true },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
