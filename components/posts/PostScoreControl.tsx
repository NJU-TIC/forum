"use client";

import { useEffect, useState, useTransition } from "react";
import { setPostScoreAction } from "@/app/actions/post";
import { MIN_GAME_SCORE, SCORE_BUDGET } from "@/lib/scoring";
import { toast } from "sonner";

const SCORE_SYNC_EVENT = "post-score-updated";

interface PostScoreControlProps {
  postId: string;
  initialScore: number;
  initialTotalScore: number;
  initialRemainingScore: number;
  className?: string;
}

export function PostScoreControl({
  postId,
  initialScore,
  initialTotalScore,
  initialRemainingScore,
  className,
}: PostScoreControlProps) {
  const [score, setScore] = useState(initialScore);
  const [totalScore, setTotalScore] = useState(initialTotalScore);
  const [remainingScore, setRemainingScore] = useState(initialRemainingScore);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handleSyncEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{
        postId: string;
        score: number;
        postTotalScore: number;
        remainingScore: number;
      }>;
      if (!customEvent.detail) return;

      setRemainingScore(customEvent.detail.remainingScore);
      if (customEvent.detail.postId === postId) {
        setScore(customEvent.detail.score);
        setTotalScore(customEvent.detail.postTotalScore);
      }
    };

    window.addEventListener(SCORE_SYNC_EVENT, handleSyncEvent as EventListener);
    return () => {
      window.removeEventListener(
        SCORE_SYNC_EVENT,
        handleSyncEvent as EventListener,
      );
    };
  }, [postId]);

  const handleScoreChange = (nextScoreRaw: number) => {
    const nextScore = Number.isInteger(nextScoreRaw) ? nextScoreRaw : score;
    if (nextScore < MIN_GAME_SCORE || nextScore > SCORE_BUDGET) {
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

    startTransition(async () => {
      const result = await setPostScoreAction(postId, nextScore);
      if (!result.success) {
        setScore(previousScore);
        setTotalScore((prev) => prev - optimisticDelta);
        setRemainingScore((prev) => prev + optimisticDelta);
        toast.error("打分失败", { description: result.error });
        return;
      }

      setScore(result.data.score);
      setTotalScore(result.data.postTotalScore);
      setRemainingScore(result.data.remainingScore);
      window.dispatchEvent(
        new CustomEvent(SCORE_SYNC_EVENT, {
          detail: {
            postId,
            score: result.data.score,
            postTotalScore: result.data.postTotalScore,
            remainingScore: result.data.remainingScore,
          },
        }),
      );
    });
  };

  return (
    <div
      className={className}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
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
          max={SCORE_BUDGET}
          step={1}
          value={score}
          disabled={isPending}
          onChange={(event) => handleScoreChange(Number(event.target.value))}
          className="w-full"
        />
        <input
          type="number"
          min={MIN_GAME_SCORE}
          max={SCORE_BUDGET}
          step={1}
          value={score}
          disabled={isPending}
          onChange={(event) => handleScoreChange(Number(event.target.value))}
          className="w-16 rounded border px-2 py-1 text-sm"
        />
      </div>
    </div>
  );
}
