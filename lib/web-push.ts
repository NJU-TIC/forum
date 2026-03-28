import "server-only";

import webpush from "web-push";
import { config } from "@/lib/config";
import {
  findPushSubscriptionsForBroadcast,
  removePushSubscriptionsByEndpoints,
  type PushSubscriptionPayload,
} from "@/lib/db/push-subscriptions";

function hasVapidConfig(): boolean {
  return Boolean(
    config.vapidPublicKey && config.vapidPrivateKey && config.vapidSubject,
  );
}

function ensureVapidConfigured(): void {
  if (!hasVapidConfig()) {
    throw new Error("Missing VAPID configuration");
  }

  webpush.setVapidDetails(
    config.vapidSubject,
    config.vapidPublicKey,
    config.vapidPrivateKey,
  );
}

export function getPublicVapidKey(): string {
  return config.vapidPublicKey;
}

export function isWebPushEnabled(): boolean {
  return hasVapidConfig();
}

type NewPostNotificationPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

function serializePushPayload(payload: NewPostNotificationPayload): string {
  return JSON.stringify({
    type: "new-post",
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag,
  });
}

function isSubscriptionGone(statusCode: number): boolean {
  return statusCode === 404 || statusCode === 410;
}

export async function sendPushToSubscriptions(
  subscriptions: PushSubscriptionPayload[],
  payload: NewPostNotificationPayload,
): Promise<void> {
  if (subscriptions.length === 0 || !isWebPushEnabled()) {
    return;
  }

  ensureVapidConfigured();

  const message = serializePushPayload(payload);
  const staleEndpoints: string[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, message);
      } catch (error) {
        const statusCode =
          (error as { statusCode?: number } | undefined)?.statusCode ?? 0;
        if (isSubscriptionGone(statusCode)) {
          staleEndpoints.push(subscription.endpoint);
          return;
        }
        console.error("Web push send failed:", error);
      }
    }),
  );

  if (staleEndpoints.length > 0) {
    await removePushSubscriptionsByEndpoints(staleEndpoints);
  }
}

export async function broadcastNewPostPush(args: {
  postId: string;
  postTitle: string;
  authorName: string;
  excludeUserId?: string;
}): Promise<void> {
  if (!isWebPushEnabled()) {
    return;
  }

  const subscriptions = await findPushSubscriptionsForBroadcast(
    args.excludeUserId,
  );

  await sendPushToSubscriptions(subscriptions, {
    title: "新帖子通知",
    body: `${args.authorName} 发布了新帖子：${args.postTitle}`,
    url: `/posts/${args.postId}`,
    tag: `post-${args.postId}`,
  });
}
