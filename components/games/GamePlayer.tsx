"use client";

interface GamePlayerProps {
  gameUrl: string;
}

export function GamePlayer({ gameUrl }: GamePlayerProps) {
  return (
    <div
      className="w-full border rounded-lg overflow-hidden bg-white"
      style={{ height: "70vh" }}
    >
      <iframe
        src={gameUrl}
        sandbox="allow-scripts allow-same-origin allow-modals allow-orientation-lock allow-pointer-lock allow-popups"
        className="w-full h-full border-0"
        title="Game"
      />
    </div>
  );
}
