"use client";

import { Card } from "@/components/ui/card";
import { SGame } from "@/schema/game";
import { SUser } from "@/schema/user";
import { useRouter } from "next/navigation";

const cardDateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "UTC",
});

interface GameCardProps {
  game: SGame & {
    author: SUser;
    createdAt: Date;
  };
}

export function GameCard({ game }: GameCardProps) {
  const router = useRouter();

  return (
    <Card
      className="p-6 mb-4 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => router.push(`/games/${game._id}`)}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
            {game.title}
          </h3>
          <div className="text-sm text-gray-400">
            {cardDateFormatter.format(new Date(game.createdAt))}
          </div>
        </div>
        <p className="text-sm text-gray-500">
          By {game.author.name}
          {game.author.isAdmin && (
            <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
              Admin
            </span>
          )}
        </p>
        <p className="text-gray-600 line-clamp-2">{game.description}</p>
      </div>
    </Card>
  );
}
