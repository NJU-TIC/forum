"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

type PostUpdate = {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  createdAt: string;
};

const POLL_INTERVAL_MS = 30_000;
const REQUEST_LIMIT = 20;

async function fetchPostUpdates(since: string | null): Promise<PostUpdate[]> {
  const searchParams = new URLSearchParams({
    limit: REQUEST_LIMIT.toString(),
  });

  if (since) {
    searchParams.set("since", since);
  }

  const response = await fetch(`/api/posts/updates?${searchParams.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch post updates");
  }

  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== "object" ||
    !("posts" in data) ||
    !Array.isArray((data as { posts?: unknown }).posts)
  ) {
    return [];
  }

  return (data as { posts: PostUpdate[] }).posts;
}

function supportsWebNotifications(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function NewPostNotifier() {
  const { data: session, status } = useSession();
  const knownPostIdsRef = useRef<Set<string>>(new Set());
  const latestSeenAtRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const pollErrorToastShownRef = useRef(false);

  const currentUserId =
    (session?.user as { id?: string } | undefined)?.id ?? null;

  useEffect(() => {
    if (status !== "authenticated") {
      knownPostIdsRef.current = new Set();
      latestSeenAtRef.current = null;
      initializedRef.current = false;
      pollErrorToastShownRef.current = false;
    }
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated" || !supportsWebNotifications()) {
      return;
    }

    if (Notification.permission === "default") {
      toast("开启新帖子通知", {
        description: "允许浏览器通知后，系统会提醒你有新帖子发布。",
        action: {
          label: "允许",
          onClick: () => {
            void Notification.requestPermission();
          },
        },
      });
    }
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;

    const pollForUpdates = async () => {
      try {
        const posts = await fetchPostUpdates(latestSeenAtRef.current);
        if (cancelled || posts.length === 0) {
          return;
        }

        const unseenPosts = posts.filter(
          (post) => !knownPostIdsRef.current.has(post.id),
        );

        for (const post of posts) {
          knownPostIdsRef.current.add(post.id);
          if (
            !latestSeenAtRef.current ||
            post.createdAt > latestSeenAtRef.current
          ) {
            latestSeenAtRef.current = post.createdAt;
          }
        }

        if (!initializedRef.current) {
          initializedRef.current = true;
          return;
        }

        if (
          !supportsWebNotifications() ||
          Notification.permission !== "granted" ||
          unseenPosts.length === 0
        ) {
          return;
        }

        const notifyPosts = unseenPosts.filter(
          (post) => post.authorId !== currentUserId,
        );

        for (const post of notifyPosts) {
          const notification = new Notification("新帖子通知", {
            body: `${post.authorName} 发布了新帖子：${post.title}`,
            tag: `post-${post.id}`,
            data: { url: `/posts/${post.id}` },
          });

          notification.onclick = () => {
            const url = String(notification.data?.url ?? "/posts");
            window.focus();
            window.location.assign(url);
            notification.close();
          };
        }
      } catch {
        if (!pollErrorToastShownRef.current) {
          toast.error("新帖子通知暂不可用", {
            description: "无法获取最新帖子，稍后会自动重试。",
          });
          pollErrorToastShownRef.current = true;
        }
      }
    };

    void pollForUpdates();
    const intervalId = window.setInterval(pollForUpdates, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [status, currentUserId]);

  return null;
}
