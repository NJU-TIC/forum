import { SUser } from "@/schema/user";

interface PostHeaderProps {
  title: string;
  author: SUser;
  createdAt: Date;
  dateFormatter: Intl.DateTimeFormat;
  titleClassName?: string;
}

export function PostHeader({
  title,
  author,
  createdAt,
  dateFormatter,
  titleClassName = "text-lg font-semibold text-gray-900",
}: PostHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className={titleClassName}>{title}</h3>
        <p className="text-sm text-gray-500">
          发布者：{author.name}
          {author.isAdmin && (
            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
              管理员
            </span>
          )}
        </p>
      </div>
      <div className="text-sm text-gray-400">
        {dateFormatter.format(new Date(createdAt))}
      </div>
    </div>
  );
}
