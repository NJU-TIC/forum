import { Card } from "@/components/ui/card";
import { QPost } from "@/schema/post";
import { QUser } from "@/schema/user";

interface PostCardProps {
  post: QPost & {
    author: QUser;
    createdAt: Date;
  };
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Card className="p-6 mb-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
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
            {post.createdAt.toLocaleDateString()}
          </div>
        </div>

        <div className="text-gray-700">{post.body.content}</div>

        <div className="flex items-center space-x-6 text-sm text-gray-500">
          <span className="flex items-center space-x-1">
            <span>❤️</span>
            <span>{post.interactions.likes} likes</span>
          </span>
          <span className="flex items-center space-x-1">
            <span>🔄</span>
            <span>{post.interactions.forwards} forwards</span>
          </span>
          <span className="flex items-center space-x-1">
            <span>💬</span>
            <span>{post.interactions.comments.length} comments</span>
          </span>
        </div>
      </div>
    </Card>
  );
}
