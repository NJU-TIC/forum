"use client";

interface GamePlayerProps {
  gameId: string;
}

export function GamePlayer({ gameId }: GamePlayerProps) {
  return (
    <div
      className="w-full border rounded-lg overflow-hidden bg-white"
      style={{ height: "70vh" }}
    >
      <iframe
        src={`/api/games/${gameId}/files/index.html`}
        sandbox="allow-scripts allow-modals allow-orientation-lock allow-pointer-lock allow-popups"
        className="w-full h-full border-0"
        title="Game"
      />
    </div>
  );
}
