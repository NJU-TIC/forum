"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

type PublicKeyResponse = {
  enabled: boolean;
  publicKey: string;
};

type SubscribeResponse = {
  success: boolean;
  error?: string;
};

function supportsWebPush(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    window.isSecureContext
  );
}

async function fetchPublicKey(): Promise<PublicKeyResponse> {
  const response = await fetch("/api/push/public-key", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load VAPID public key");
  }

  const data = (await response.json()) as unknown;
  if (
    !data ||
    typeof data !== "object" ||
    typeof (data as { enabled?: unknown }).enabled !== "boolean" ||
    typeof (data as { publicKey?: unknown }).publicKey !== "string"
  ) {
    throw new Error("Invalid VAPID public key response");
  }

  return data as PublicKeyResponse;
}

function base64UrlToUint8Array(base64UrlString: string): Uint8Array {
  const padding = "=".repeat((4 - (base64UrlString.length % 4)) % 4);
  const base64 = (base64UrlString + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function NewPostNotifier() {
  const { data: session, status } = useSession();
  const subscribedUserIdRef = useRef<string | null>(null);
  const setupErrorShownRef = useRef(false);

  const currentUserId =
    (session?.user as { id?: string } | undefined)?.id ?? null;

  useEffect(() => {
    if (status !== "authenticated") {
      subscribedUserIdRef.current = null;
      setupErrorShownRef.current = false;
      return;
    }

    if (!currentUserId || !supportsWebPush()) {
      return;
    }

    if (subscribedUserIdRef.current === currentUserId) {
      return;
    }

    const registerWebPush = async () => {
      try {
        const { enabled, publicKey } = await fetchPublicKey();
        if (!enabled || !publicKey) {
          return;
        }

        const permission =
          Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();

        if (permission !== "granted") {
          return;
        }

        const registration = await navigator.serviceWorker.register("/sw.js");
        const applicationServerKey = base64UrlToUint8Array(publicKey);

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        }

        const subscribeResponse = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(subscription),
        });

        if (!subscribeResponse.ok) {
          const payload = (await subscribeResponse.json().catch(() => null)) as
            | SubscribeResponse
            | null;
          const message = payload?.error ?? "Push subscription failed";
          throw new Error(message);
        }

        subscribedUserIdRef.current = currentUserId;
      } catch (error) {
        console.error("Failed to setup web push:", error);
        if (!setupErrorShownRef.current) {
          toast.error("开启离线推送失败", {
            description: "请稍后重试，或检查浏览器通知与站点权限。",
          });
          setupErrorShownRef.current = true;
        }
      }
    };

    void registerWebPush();
  }, [status, currentUserId]);

  return null;
}
