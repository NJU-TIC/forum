"use client";

import { useRouter } from "next/navigation";
import { uploadGameAction } from "@/app/actions/game";
import { GameUploadForm } from "@/components/games/GameUploadForm";

export default function UploadGamePage() {
  const router = useRouter();

  const handleSuccess = (data: { game: { _id: string } }) => {
    router.push(`/games/${data.game._id}`);
  };

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
      <GameUploadForm action={uploadGameAction} onSuccess={handleSuccess} />
    </div>
  );
}
