import { NextResponse } from "next/server";
import { getPublicVapidKey, isWebPushEnabled } from "@/lib/web-push";

export async function GET() {
  const enabled = isWebPushEnabled();
  const publicKey = getPublicVapidKey();

  return NextResponse.json(
    {
      enabled,
      publicKey: enabled ? publicKey : "",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
