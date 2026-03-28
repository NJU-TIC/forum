import { getCollection } from "@/lib/mongodb";

export type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type PushSubscriptionDocument = PushSubscriptionPayload & {
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function validatePushSubscriptionPayload(
  payload: unknown,
): PushSubscriptionPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as {
    endpoint?: unknown;
    expirationTime?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown } | unknown;
  };

  if (!isNonEmptyString(candidate.endpoint)) {
    return null;
  }

  if (!candidate.keys || typeof candidate.keys !== "object") {
    return null;
  }

  const keys = candidate.keys as { p256dh?: unknown; auth?: unknown };
  if (!isNonEmptyString(keys.p256dh) || !isNonEmptyString(keys.auth)) {
    return null;
  }

  const expirationTime =
    typeof candidate.expirationTime === "number" ||
    candidate.expirationTime === null
      ? candidate.expirationTime
      : null;

  return {
    endpoint: candidate.endpoint,
    expirationTime,
    keys: {
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  };
}

export async function upsertPushSubscription(
  userId: string,
  subscription: PushSubscriptionPayload,
): Promise<void> {
  const collection = await getCollection<PushSubscriptionDocument>(
    "pushSubscriptions",
  );
  await collection.createIndex({ endpoint: 1 }, { unique: true });

  await collection.updateOne(
    { endpoint: subscription.endpoint },
    {
      $set: {
        userId,
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        keys: subscription.keys,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export async function findPushSubscriptionsForBroadcast(
  excludeUserId?: string,
): Promise<PushSubscriptionPayload[]> {
  const collection = await getCollection<PushSubscriptionDocument>(
    "pushSubscriptions",
  );
  const query = excludeUserId ? { userId: { $ne: excludeUserId } } : {};
  const subscriptions = await collection.find(query).toArray();

  return subscriptions.map((subscription) => ({
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: subscription.keys,
  }));
}

export async function removePushSubscriptionsByEndpoints(
  endpoints: string[],
): Promise<void> {
  if (endpoints.length === 0) {
    return;
  }

  const collection = await getCollection<PushSubscriptionDocument>(
    "pushSubscriptions",
  );
  await collection.deleteMany({ endpoint: { $in: endpoints } });
}
