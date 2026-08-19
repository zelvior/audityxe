"use client";

import { Tone } from "@/lib/types";

export default function ToneToggle({
  tone,
  onChange,
}: {
  tone: Tone;
  onChange: (t: Tone) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full glass text-xs font-mono">
      <button
        onClick={() => onChange("constructive")}
        className={`px-3.5 py-1.5 rounded-full transition ${
          tone === "constructive" ? "bg-emerald/20 text-emerald" : "text-text-secondary"
        }`}
      >
        Constructive
      </button>
      <button
        onClick={() => onChange("brutal")}
        className={`px-3.5 py-1.5 rounded-full transition ${
          tone === "brutal" ? "bg-rose/20 text-rose" : "text-text-secondary"
        }`}
      >
        Brutal Roast
      </button>
    </div>
  );
}
