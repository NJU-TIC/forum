import type { SGame } from "@/schema/game";
import type {
  GameZipAssetAnalysis,
  GameZipJsAnalysis,
} from "@/lib/validation/game-zip";

export interface UploadGameActionSuccessData {
  game: SGame;
  jsAnalysis: GameZipJsAnalysis;
  assetAnalysis: GameZipAssetAnalysis;
}
