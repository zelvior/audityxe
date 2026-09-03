"use client";

import { useEffect, useState } from "react";
import { X, Zap, ShieldCheck, Layers } from "lucide-react";

const STORAGE_KEY = "audityxe:onboarding-dismissed";

const STEPS = [
  { icon: Zap, text: "Paste any URL below and click Analyze — no setup, first result in under a minute." },
  { icon: ShieldCheck, text: "You'll get 6 category scores plus a written verdict, backed by real HTTP/HTML signals — not a guess." },
  { icon: Layers, text: "Sign in to save your daily quota and unlock competitor comparison, promo copy, and bulk audits on paid plans." },
];

export default function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  const Icon = STEPS[step].icon;

  return (
    <div className="max-w-lg mx-auto mb-6 px-4 sm:px-0">
      <div className="glass rounded-card p-4 sm:p-5 flex items-start gap-3">
        <div className="w-9 h-9 rounded-btn bg-secondary flex items-center justify-center shrink-0">
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-secondary">{STEPS[step].text}</p>
          <div className="flex items-center gap-1.5 mt-3">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${i === step ? "w-5 bg-primary" : "w-1.5 bg-border"}`}
              />
            ))}
            <div className="ml-auto flex items-center gap-3">
              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="text-xs font-mono text-primary hover:underline"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={dismiss}
                  className="text-xs font-mono text-primary hover:underline"
                >
                  Got it
                </button>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss onboarding"
          className="text-text-secondary hover:text-text-primary transition shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
