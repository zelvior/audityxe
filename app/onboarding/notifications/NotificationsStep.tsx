"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Bell } from "lucide-react";
import NotificationEnabler from "@/components/NotificationEnabler";

export default function NotificationsStep() {
  const router = useRouter();
  const [satisfied, setSatisfied] = useState(false);

  function next() {
    const param = new URLSearchParams(window.location.search).get("next");
    const safe = param && param.startsWith("/") && !param.startsWith("//") ? param : "/onboarding/get-started";
    router.push(safe);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/onboarding/features" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6">
        <ArrowLeft size={16} /> Back to features
      </Link>

      <div className="flex items-center gap-3 mb-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-card bg-primary/10 border border-primary/20 shrink-0">
          <Bell size={18} className="text-primary" />
        </span>
        <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl tracking-tight">
          <span className="hand-underline">Turn on notifications</span>
        </h1>
      </div>

      <p className="text-text-secondary text-sm sm:text-base mb-8 max-w-xl">
        Audityxe notifies you every time an audit completes — even if you've switched tabs or closed the page. This is required and there's nothing to toggle later.
      </p>

      <div className="glass rounded-card p-5 sm:p-6 mb-8">
        <NotificationEnabler onSatisfied={setSatisfied} />
      </div>

      <button
        type="button"
        onClick={next}
        disabled={!satisfied}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-card bg-secondary font-semibold text-sm hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue
        <ArrowRight size={16} />
      </button>
    </div>
  );
}
