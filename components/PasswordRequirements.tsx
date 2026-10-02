"use client";

import { Check, Circle } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/password-policy";

/** Live checklist of the password rules. Pure display — the actual
 * enforcement is validatePassword() in the submit handlers. */
export default function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul aria-label="Password requirements" className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(password);
        return (
          <li key={r.id} className={`flex items-center gap-1.5 text-[11px] ${ok ? "text-emerald" : "text-text-secondary"}`}>
            {ok ? <Check size={12} aria-hidden="true" /> : <Circle size={10} aria-hidden="true" />}
            <span>
              {r.label}
              <span className="sr-only">{ok ? " — met" : " — not met"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
