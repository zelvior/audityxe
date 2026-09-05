"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * "Request Runner" — press Space/tap to jump a packet over 500 blockers.
 * Distinct mechanic from the 404 page's Link Chaser per spec.
 */
export default function OfflineGame() {
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const jumpingRef = useRef(false);
  const packetRef = useRef<HTMLDivElement>(null);
  const obstacleRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const obstacleXRef = useRef(320);
  const scoreRef = useRef(0);

  const jump = useCallback(() => {
    if (jumpingRef.current || !running || over) return;
    jumpingRef.current = true;
    const el = packetRef.current;
    if (!el) return;
    el.style.transition = "transform 0.28s ease-out";
    el.style.transform = "translateY(-64px)";
    setTimeout(() => {
      if (!el) return;
      el.style.transition = "transform 0.28s ease-in";
      el.style.transform = "translateY(0)";
      setTimeout(() => (jumpingRef.current = false), 280);
    }, 280);
  }, [running, over]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space") jump();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump]);

  useEffect(() => {
    if (!running || over) return;
    obstacleXRef.current = 320;

    function tick() {
      obstacleXRef.current -= 4;
      if (obstacleXRef.current < -20) {
        obstacleXRef.current = 320;
        scoreRef.current += 1;
        setScore(scoreRef.current);
      }
      if (obstacleRef.current) {
        obstacleRef.current.style.transform = `translateX(${obstacleXRef.current}px)`;
      }

      const jumping = jumpingRef.current;
      if (obstacleXRef.current > 10 && obstacleXRef.current < 40 && !jumping) {
        setOver(true);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, over]);

  function start() {
    scoreRef.current = 0;
    setScore(0);
    setOver(false);
    setRunning(true);
  }

  return (
    <div className="mt-10 max-w-sm mx-auto">
      <div
        onClick={jump}
        className="relative w-full h-40 rounded-card glass overflow-hidden cursor-pointer select-none"
      >
        {!running || over ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-4">
            <p className="font-mono text-xs text-text-secondary">
              {over ? `Cleared ${score} blockers` : "No connection — jump some 500s"}
            </p>
            <button
              onClick={start}
              className="px-4 py-2 rounded-btn bg-secondary text-text-primary text-sm font-semibold hover:brightness-110 transition"
            >
              {over ? "Retry" : "Start (Space or tap)"}
            </button>
          </div>
        ) : (
          <>
            <div className="absolute top-2 left-2 font-mono text-[10px] text-text-secondary">
              Score {score}
            </div>
            <div
              ref={packetRef}
              className="absolute bottom-4 left-6 w-6 h-6 rounded-btn bg-primary"
            />
            <div
              ref={obstacleRef}
              className="absolute bottom-4 w-4 h-8 rounded-btn bg-rose"
              style={{ left: 0 }}
            />
            <div className="absolute bottom-3 left-0 right-0 h-px bg-border" />
          </>
        )}
      </div>
    </div>
  );
}
