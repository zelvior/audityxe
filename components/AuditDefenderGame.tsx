"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Search,
  Gauge,
  Shield,
  Accessibility as AccessibilityIcon,
  LayoutGrid,
  Smartphone,
  Lock,
  Image as ImageIcon,
  Timer,
  Trophy,
  RotateCcw,
  Check,
} from "lucide-react";
import { ISSUE_POOL, type AuditIssue, type IssueCategory } from "@/lib/audit-defender-data";

const GAME_SECONDS = 60;
const WRONG_TIME_PENALTY = 3;
const WRONG_SCORE_PENALTY = 5;

const CATEGORY_ICON: Record<IssueCategory, typeof Search> = {
  SEO: Search,
  Performance: Gauge,
  Security: Shield,
  Accessibility: AccessibilityIcon,
  "UI/UX": LayoutGrid,
  Mobile: Smartphone,
};

/** Tiny seedable PRNG (mulberry32) — the game still gets a different,
 * effectively-random issue order every playthrough (seeded from
 * Date.now() by default), but the shuffle itself is a pure, testable
 * function of its seed rather than reaching for Math.random() directly
 * everywhere, per the "deterministic enough to test" requirement. */
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildRound(rng: () => number): AuditIssue[] {
  return shuffle(ISSUE_POOL, rng);
}

function gradeFor(accuracy: number, score: number): string {
  if (accuracy >= 90 && score >= 150) return "A+";
  if (accuracy >= 80) return "A";
  if (accuracy >= 65) return "B";
  if (accuracy >= 45) return "C";
  return "D";
}

type Phase = "idle" | "playing" | "done";

/** A compact "simulated website" mock — generic wireframe blocks with a
 * highlighted region that moves depending on the current issue's
 * category, so the panel feels connected to the issue at hand without
 * needing 30+ bespoke mockups. Purely decorative; no real DOM to audit. */
function SitePreview({ category, flash }: { category: IssueCategory | null; flash: "correct" | "wrong" | null }) {
  const reduceMotion = useReducedMotion();
  const highlight: Partial<Record<IssueCategory, string>> = {
    SEO: "top-[6px] left-[8px] w-[70px] h-[10px]",
    Performance: "top-[34px] left-[8px] w-[64px] h-[38px]",
    Security: "top-[6px] left-[8px] w-[110px] h-[10px]",
    Accessibility: "top-[34px] left-[8px] w-[64px] h-[38px]",
    "UI/UX": "top-[80px] right-[8px] w-[50px] h-[16px]",
    Mobile: "inset-[4px]",
  };
  return (
    <div className="rounded-card border border-border bg-surface overflow-hidden select-none">
      {/* fake browser chrome */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-border bg-surface2">
        <span className="w-2 h-2 rounded-full bg-rose/60" />
        <span className="w-2 h-2 rounded-full bg-amber/60" />
        <span className="w-2 h-2 rounded-full bg-emerald/60" />
        <span className="ml-2 flex items-center gap-1 text-[9px] font-mono text-text-secondary bg-bg rounded px-2 py-0.5">
          <Lock size={8} /> example.com
        </span>
      </div>
      {/* fake page content */}
      <div className="relative h-[130px] p-2">
        <div className="h-2 w-24 rounded bg-text-primary/15 mb-2" />
        <div className="flex gap-2">
          <div className="w-16 h-10 rounded bg-primary/10 border border-primary/15 flex items-center justify-center">
            <ImageIcon size={14} className="text-primary/40" />
          </div>
          <div className="flex-1 space-y-1.5 pt-1">
            <div className="h-1.5 rounded bg-text-primary/10 w-full" />
            <div className="h-1.5 rounded bg-text-primary/10 w-4/5" />
            <div className="h-1.5 rounded bg-text-primary/10 w-3/5" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 w-14 h-4 rounded bg-primary/20 border border-primary/25" />

        {category && (
          <motion.div
            key={category}
            className={`absolute rounded border-2 border-dashed ${
              flash === "correct" ? "border-emerald" : flash === "wrong" ? "border-rose" : "border-accent"
            } ${highlight[category] ?? ""}`}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * "Audit Defender" — a 60-second find-the-bug challenge built from the
 * same category vocabulary as the real audit engine (SEO, Performance,
 * Security, Accessibility, UI/UX, Mobile). Desktop-only by design (see
 * the hidden lg:block wrapper wherever this is mounted) — entirely
 * self-contained, client-side, no auth/backend/storage, and never
 * touches or blocks the real /api/audit flow.
 */
export default function AuditDefenderGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState<AuditIssue[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [choices, setChoices] = useState<string[]>([]);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [locked, setLocked] = useState(false);
  const [liveMsg, setLiveMsg] = useState("");
  const rngRef = useRef<() => number>(Math.random);
  const reduceMotion = useReducedMotion();

  const current = phase === "playing" ? round[index % round.length] : null;

  const nextIssue = useCallback(
    (r: AuditIssue[], i: number) => {
      const issueItem = r[i % r.length];
      const opts = shuffle([issueItem.correctFix, ...issueItem.wrongFixes], rngRef.current);
      setChoices(opts);
      setFlash(null);
      setLocked(false);
    },
    []
  );

  function startGame() {
    const seed = Date.now() ^ 0x9e3779b9;
    rngRef.current = mulberry32(seed);
    const r = buildRound(rngRef.current);
    setRound(r);
    setIndex(0);
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setTimeLeft(GAME_SECONDS);
    setPhase("playing");
    nextIssue(r, 0);
    setLiveMsg("Game started. 60 seconds on the clock.");
  }

  function endGame() {
    setPhase("done");
    setLiveMsg("Time's up.");
  }

  // countdown
  useEffect(() => {
    if (phase !== "playing") return;
    if (timeLeft <= 0) {
      endGame();
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  function handleChoice(choice: string) {
    if (!current || locked || phase !== "playing") return;
    setLocked(true);
    const isCorrect = choice === current.correctFix;
    if (isCorrect) {
      setScore((s) => s + current.points);
      setCorrectCount((c) => c + 1);
      setFlash("correct");
      setLiveMsg(`Correct — fixed: ${current.title}. Plus ${current.points} points.`);
    } else {
      setScore((s) => Math.max(0, s - WRONG_SCORE_PENALTY));
      setWrongCount((c) => c + 1);
      setFlash("wrong");
      setTimeLeft((t) => Math.max(0, t - WRONG_TIME_PENALTY));
      setLiveMsg(`Not quite. The fix was: ${current.correctFix}. Minus ${WRONG_SCORE_PENALTY} points, minus ${WRONG_TIME_PENALTY} seconds.`);
    }
    window.setTimeout(() => {
      setIndex((i) => {
        const next = i + 1;
        nextIssue(round, next);
        return next;
      });
    }, reduceMotion ? 250 : 700);
  }

  function resetGame() {
    setPhase("idle");
  }

  const total = correctCount + wrongCount;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const grade = gradeFor(accuracy, score);

  return (
    <div className="w-full max-w-md mx-auto lg:mx-0">
      <div className="glass rounded-card p-4 sm:p-5 border border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-display font-semibold text-sm text-text-primary">Audit Defender</p>
            <p className="text-[11px] text-text-secondary">Find and fix real audit issues before the clock runs out.</p>
          </div>
          <span className="flex items-center justify-center w-8 h-8 rounded-card bg-primary/10 border border-primary/20 shrink-0">
            <Trophy size={14} className="text-primary" />
          </span>
        </div>

        <div aria-live="polite" className="sr-only">
          {liveMsg}
        </div>

        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={reduceMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? {} : { opacity: 0 }}
            >
              <SitePreview category={null} flash={null} />
              <p className="text-xs text-text-secondary mt-3 mb-3">
                60 seconds. Real SEO, performance, security, accessibility, UI/UX, and mobile issues — pick the
                correct fix for each before time runs out.
              </p>
              <button
                type="button"
                onClick={startGame}
                className="w-full h-10 rounded-btn bg-primary text-white text-sm font-semibold hover:brightness-110 transition"
              >
                Start Game
              </button>
            </motion.div>
          )}

          {phase === "playing" && current && (
            <motion.div key="playing" initial={reduceMotion ? {} : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduceMotion ? {} : { opacity: 0 }}>
              <div className="flex items-center justify-between mb-2 text-xs font-mono">
                <span className="flex items-center gap-1 text-text-secondary">
                  <Timer size={12} /> {timeLeft}s
                </span>
                <span className="flex items-center gap-1 text-primary font-semibold">
                  <Trophy size={12} /> {score} pts
                </span>
              </div>
              <div className="h-1 rounded-full bg-border mb-3 overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  animate={{ width: `${(timeLeft / GAME_SECONDS) * 100}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              <SitePreview category={current.category} flash={flash} />

              <div className="mt-3">
                <div className="flex items-center gap-1.5 mb-1">
                  {(() => {
                    const Icon = CATEGORY_ICON[current.category];
                    return <Icon size={12} className="text-primary shrink-0" />;
                  })()}
                  <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wide">
                    {current.category} · {current.difficulty}
                  </span>
                </div>
                <p className="font-display font-semibold text-sm text-text-primary mb-1">{current.title}</p>
                <p className="text-xs text-text-secondary mb-3">{current.description}</p>

                <div className="space-y-2">
                  {choices.map((choice) => {
                    const isThisCorrect = choice === current.correctFix;
                    const showState = locked && (isThisCorrect || flash === "wrong");
                    return (
                      <button
                        key={choice}
                        type="button"
                        disabled={locked}
                        onClick={() => handleChoice(choice)}
                        className={`w-full text-left text-xs sm:text-[13px] rounded-btn border px-3 py-2 transition-colors flex items-center gap-2 ${
                          locked && isThisCorrect
                            ? "border-emerald bg-emerald/10 text-text-primary"
                            : locked && !isThisCorrect
                              ? "border-border bg-surface2 text-text-secondary"
                              : "border-border bg-surface hover:border-primary/40 text-text-primary"
                        }`}
                      >
                        {showState && isThisCorrect && <Check size={13} className="text-emerald shrink-0" />}
                        <span>{choice}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {phase === "done" && (
            <motion.div key="done" initial={reduceMotion ? {} : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduceMotion ? {} : { opacity: 0 }}>
              <div className="text-center py-2">
                <p className="text-[11px] font-mono text-text-secondary mb-1">FINAL AUDIT GRADE</p>
                <p className="font-display font-bold text-4xl text-primary mb-3">{grade}</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="rounded-card border border-border p-2">
                    <p className="font-display font-semibold text-sm text-text-primary">{score}</p>
                    <p className="text-[10px] text-text-secondary">Score</p>
                  </div>
                  <div className="rounded-card border border-border p-2">
                    <p className="font-display font-semibold text-sm text-text-primary">{correctCount}</p>
                    <p className="text-[10px] text-text-secondary">Fixed</p>
                  </div>
                  <div className="rounded-card border border-border p-2">
                    <p className="font-display font-semibold text-sm text-text-primary">{accuracy}%</p>
                    <p className="text-[10px] text-text-secondary">Accuracy</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetGame}
                  className="w-full h-10 rounded-btn bg-primary text-white text-sm font-semibold hover:brightness-110 transition flex items-center justify-center gap-2"
                >
                  <RotateCcw size={14} /> Play Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
