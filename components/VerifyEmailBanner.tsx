"use client";

import Link from "next/link";
import { MailCheck, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function VerifyEmailBanner() {
  const { user } = useAuth();

  return (
    <div className="px-4 sm:px-6 pb-2">
      <Link
        href="/verify-email"
        className="max-w-3xl mx-auto glass rounded-2xl p-4 sm:p-5 border border-amber/30 flex items-center gap-3 hover:border-amber/50 transition group"
      >
        <MailCheck size={18} className="text-amber shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Verify your email to run audits</p>
          <p className="text-xs text-text-secondary truncate">
            We sent a link to {user?.email} — check spam if you don't see it.
          </p>
        </div>
        <ArrowRight size={16} className="text-text-secondary group-hover:text-amber transition shrink-0" />
      </Link>
    </div>
  );
}
