"use client";

import { useEffect, useState } from "react";
import { X, Zap, ShieldCheck, Layers, ArrowRight, Play, Bell } from "lucide-react";
import NotificationEnabler from "@/components/NotificationEnabler";

const STORAGE_KEY = "audityxe:onboarding-completed";

const STEPS: { icon: typeof Zap; text: string; requiresNotifications?: boolean }[] = [
  { icon: Zap, text: "Paste any URL below and click Analyze. No setup, first result in under a minute." },
  { icon: ShieldCheck, text: "You'll get 6 category scores plus a written verdict, backed by real HTTP/HTML signals, not a guess." },
  { icon: Layers, text: "Sign in to save your daily quota and unlock competitor comparison, promo copy, and bulk audits on paid plans." },
  { icon: Bell, text: "Last step: turn on notifications. You'll be alerted every time an audit completes, even if you've closed the tab. This is required.", requiresNotifications: true },
];

export default function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [notificationsOk, setNotificationsOk] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function complete() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else if (notificationsOk) {
      complete();
    }
  }

  // Skipping lands on the required notification step instead of
  // dismissing onboarding outright.
  function skip() {
    setStep(STEPS.length - 1);
  }

  if (!visible) return null;

  const Icon = STEPS[step].icon;
  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 glass rounded-2xl p-6 sm:p-8">
        {/* Close button — hidden on the required notification step */}
        {!isLastStep && (
          <button
            onClick={skip}
            aria-label="Skip to notifications"
            className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition"
          >
            <X size={20} />
          </button>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-8 bg-primary" : "w-3 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
          <Icon size={22} className="text-primary" />
        </div>

        {/* Text */}
        <p className="text-text-secondary text-sm sm:text-base leading-relaxed mb-6">
          {STEPS[step].text}
        </p>

        {STEPS[step].requiresNotifications && (
          <div className="mb-6">
            <NotificationEnabler onSatisfied={setNotificationsOk} />
          </div>
        )}

        {/* Video section — shown on first step */}
        {step === 0 && (
          <div className="mb-6">
            <div
              className="relative rounded-xl overflow-hidden border border-border group"
              style={{ perspective: "800px" }}
            >
              <div
                className="relative transition-transform duration-500 group-hover:scale-[1.02]"
                style={{
                  transform: "rotateX(2deg) rotateY(-1deg)",
                  transformStyle: "preserve-3d",
                }}
              >
                <video
                  src="/brag.mp4"
                  poster="/brag.jpg"
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-auto"
                />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
            </div>
            <p className="text-center text-xs text-text-secondary mt-2 flex items-center justify-center gap-1">
              <Play size={12} /> Watch: Audityxe in action (20s)
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          {!isLastStep ? (
            <button
              onClick={skip}
              className="text-xs font-mono text-text-secondary hover:text-text-primary transition"
            >
              Skip
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={next}
            disabled={isLastStep && !notificationsOk}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-btn bg-secondary text-sm font-semibold hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLastStep ? "Get started" : "Next"}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
