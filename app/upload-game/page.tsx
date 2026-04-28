"use client";

import { uploadGameAction } from "@/app/actions/game";
import { GameUploadForm } from "@/components/games/GameUploadForm";

export default function UploadGamePage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Upload Game
        </h1>
        <p className="text-gray-600">
          Upload a ZIP file containing your HTML game
        </p>
      </div>
      <GameUploadForm action={uploadGameAction} />
    </div>
  );
}
