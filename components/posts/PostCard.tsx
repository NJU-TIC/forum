"use client";

import { Card } from "@/components/ui/card";
import { SPost } from "@/schema/post";
import { SUser } from "@/schema/user";
import { useRouter } from "next/navigation";
import Markdown from "react-markdown";
import { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { PostInteractions } from "./PostInteractions";

const cardDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "UTC",
});

const postMarkdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">{children}</h1>
  ),

  h2: ({ children }) => (
    <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight">
      {children}
    </h2>
  ),

  p: ({ children }) => (
    <p className="leading-7 [&:not(:first-child)]:mt-6">{children}</p>
  ),

  ul: ({ children }) => <ul className="my-6 ml-6 list-disc">{children}</ul>,

  a: ({ href, children }) => {
    const isExternal = !!href && /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        className="text-[#2563EB] underline underline-offset-2 hover:text-[#1D4ED8] break-all"
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  },

  code(props) {
    const { children, className, ...rest } = props;
    const content = String(children).replace(/\n$/, "");
    const language = /language-([A-Za-z0-9_+-]+)/.exec(className || "")?.[1] ?? "text";
    const isInline = !className && !content.includes("\n");

    if (isInline) {
      return (
        <code
          {...rest}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]"
        >
          {children}
        </code>
      );
    }

    return (
      <div className="my-4 overflow-x-auto rounded-md border bg-muted px-4 py-3">
        <SyntaxHighlighter
          PreTag="div"
          language={language}
          style={oneLight}
          customStyle={{
            margin: 0,
            padding: 0,
            background: "transparent",
            fontSize: "0.8125rem",
            lineHeight: "1.5",
          }}
          codeTagProps={{ className: "font-mono" }}
          wrapLongLines
        >
          {content}
        </SyntaxHighlighter>
      </div>
    );
  },

  blockquote: ({ children }) => (
    <blockquote className="mt-6 border-l-2 pl-6 italic">{children}</blockquote>
  ),

  table: ({ children }) => (
    <div className="my-6 w-full overflow-x-auto rounded-md border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),

  th: ({ children }) => (
    <th className="border px-3 py-2 text-left font-semibold">{children}</th>
  ),

  td: ({ children }) => <td className="border px-3 py-2 align-top">{children}</td>,
};

interface PostCardProps {
  post: SPost & {
    author: SUser;
    createdAt: Date;
  };
  currentUserId?: string;
}

export function PostCard({ post, currentUserId }: PostCardProps) {
  const router = useRouter();

  return (
    <Card
      className="p-6 mb-4 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => router.push(`/posts/${post._id}`)}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3
              className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => router.push(`/posts/${post._id}`)}
            >
              {post.title}
            </h3>
            <p className="text-sm text-gray-500">
              By {post.author.name}
              {post.author.isAdmin && (
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  Admin
                </span>
              )}
            </p>
          </div>
          <div className="text-sm text-gray-400">
            {cardDateFormatter.format(new Date(post.createdAt))}
          </div>
        </div>

        <Markdown
          remarkPlugins={[remarkGfm]}
          components={postMarkdownComponents}
        >
          {post.body.content}
        </Markdown>

        <PostInteractions
          postId={post._id}
          initialLikes={post.interactions.likes.length}
          initialForwards={post.interactions.forwards.length}
          commentsCount={post.interactions.comments.length}
          initialLiked={currentUserId ? post.interactions.likes.includes(currentUserId) : false}
          initialForwarded={currentUserId ? post.interactions.forwards.includes(currentUserId) : false}
          onCommentClick={() => router.push(`/posts/${post._id}`)}
        />
      </div>
    </Card>
  );
}
