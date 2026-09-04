"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "Link Chaser" — click the moving 200 target before it escapes, 20s.
 * Distinct from the offline game (RequestRunner) per spec.
 */
export default function NotFoundGame() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [started, setStarted] = useState(false);
  const [over, setOver] = useState(false);

  function moveTarget() {
    const el = boxRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    setPos({
      x: Math.random() * (w - 56),
      y: Math.random() * (h - 56),
    });
  }

  useEffect(() => {
    if (!started || over) return;
    if (timeLeft <= 0) {
      setOver(true);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [started, over, timeLeft]);

  function start() {
    setScore(0);
    setTimeLeft(20);
    setOver(false);
    setStarted(true);
    moveTarget();
  }

  function hit() {
    setScore((s) => s + 1);
    moveTarget();
  }

  return (
    <div className="mt-10 max-w-sm mx-auto">
      <div
        ref={boxRef}
        className="relative w-full h-56 rounded-card glass overflow-hidden"
      >
        {!started || over ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-4">
            <p className="font-mono text-xs text-text-secondary">
              {over ? `Score: ${score} — while you're here` : "While you're here"}
            </p>
            <button
              onClick={start}
              className="px-4 py-2 rounded-btn bg-secondary text-text-primary text-sm font-semibold hover:brightness-110 transition"
            >
              {over ? "Play again" : "Catch the 200"}
            </button>
          </div>
        ) : (
          <>
            <div className="absolute top-2 left-2 font-mono text-[10px] text-text-secondary">
              Score {score} · {timeLeft}s
            </div>
            <button
              onClick={hit}
              style={{ left: pos.x, top: pos.y }}
              className="absolute w-14 h-14 rounded-btn bg-accent text-[10px] font-mono font-bold text-text-primary flex items-center justify-center"
            >
              200
            </button>
          </>
        )}
      </div>
    </div>
  );
}
