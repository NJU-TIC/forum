"use client";

import { useEffect, useRef, useState } from "react";
import { setGameScoreAction } from "@/app/actions/game";
import { MIN_GAME_SCORE, SCORE_BUDGET } from "@/lib/scoring";
import { toast } from "sonner";

const SCORE_SYNC_EVENT = "game-score-updated";

interface GameScoreControlProps {
  gameId: string;
  initialScore: number;
  initialTotalScore: number;
  initialRemainingScore: number;
  className?: string;
}

export function GameScoreControl({
  gameId,
  initialScore,
  initialTotalScore,
  initialRemainingScore,
  className,
}: GameScoreControlProps) {
  const [score, setScore] = useState(initialScore);
  const [totalScore, setTotalScore] = useState(initialTotalScore);
  const [remainingScore, setRemainingScore] = useState(initialRemainingScore);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const maxAssignableScore = Math.min(SCORE_BUDGET, score + remainingScore);

  useEffect(() => {
    const handleSyncEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{
        gameId: string;
        score: number;
        gameTotalScore: number;
        remainingScore: number;
      }>;
      if (!customEvent.detail) return;

      setRemainingScore(customEvent.detail.remainingScore);
      if (customEvent.detail.gameId === gameId) {
        setScore(customEvent.detail.score);
        setTotalScore(customEvent.detail.gameTotalScore);
      }
    };

    window.addEventListener(SCORE_SYNC_EVENT, handleSyncEvent as EventListener);
    return () => {
      window.removeEventListener(
        SCORE_SYNC_EVENT,
        handleSyncEvent as EventListener,
      );
    };
  }, [gameId]);

  const handleScoreChange = (nextScoreRaw: number) => {
    if (isSavingRef.current) {
      return;
    }

    const nextScore = Number.isInteger(nextScoreRaw) ? nextScoreRaw : score;
    if (nextScore < MIN_GAME_SCORE || nextScore > SCORE_BUDGET) {
      return;
    }

    if (nextScore > maxAssignableScore) {
      toast.error("超过可分配上限", {
        description: `当前该作品最高可分配 ${maxAssignableScore} 分`,
      });
      return;
    }

    const previousScore = score;
    if (nextScore === previousScore) {
      return;
    }

    const optimisticDelta = nextScore - previousScore;
    setScore(nextScore);
    setTotalScore((prev) => prev + optimisticDelta);
    setRemainingScore((prev) => prev - optimisticDelta);

    isSavingRef.current = true;
    setIsSaving(true);

    void (async () => {
      const result = await setGameScoreAction(gameId, nextScore);
      if (!result.success) {
        setScore(previousScore);
        setTotalScore((prev) => prev - optimisticDelta);
        setRemainingScore((prev) => prev + optimisticDelta);
        toast.error("打分失败", { description: result.error });
        return;
      }

      setScore(result.data.score);
      setTotalScore(result.data.gameTotalScore);
      setRemainingScore(result.data.remainingScore);
      window.dispatchEvent(
        new CustomEvent(SCORE_SYNC_EVENT, {
          detail: {
            gameId,
            score: result.data.score,
            gameTotalScore: result.data.gameTotalScore,
            remainingScore: result.data.remainingScore,
          },
        }),
      );
    })().finally(() => {
      isSavingRef.current = false;
      setIsSaving(false);
    });
  };

  return (
    <div
      className={className}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
        <span>
          总分：<span className="font-semibold text-gray-900">{totalScore}</span>
        </span>
        <span>你剩余：{remainingScore}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={MIN_GAME_SCORE}
          max={maxAssignableScore}
          step={1}
          value={score}
          disabled={isSaving}
          onChange={(event) => handleScoreChange(Number(event.target.value))}
          className="w-full"
        />
        <input
          type="number"
          min={MIN_GAME_SCORE}
          max={maxAssignableScore}
          step={1}
          value={score}
          disabled={isSaving}
          onChange={(event) => handleScoreChange(Number(event.target.value))}
          className="w-16 rounded border px-2 py-1 text-sm"
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        当前此作品最多可分配 {maxAssignableScore} 分
      </p>
    </div>
  );
}
