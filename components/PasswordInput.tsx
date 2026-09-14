"use client";

import { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Drop-in replacement for `<input type="password">` with a show/hide
 * eye toggle. Accepts the same props as a normal input; `className`
 * styles the input itself (the toggle button is absolutely positioned
 * over it), so pass the same classes you'd give a plain input.
 *
 * Two bugs fixed here:
 * 1. The toggle used `hover:text-text-primary` — a hardcoded color that broke
 *    under the Paper Light theme (a white icon on a near-white
 *    background is effectively invisible on hover). Swapped for the
 *    theme-token `hover:text-primary`, which resolves correctly no
 *    matter which theme is active.
 * 2. Chromium-based Edge injects its OWN native reveal-password eye
 *    icon inside `type="password"` inputs, which sat directly on top
 *    of this custom button — the actual cause of the icon looking
 *    "not aligned perfectly" (two icons fighting for the same pixels,
 *    not a real CSS offset in this component). `autoComplete="off"`
 *    combined with the global `::-ms-reveal`/`::-ms-clear` suppression
 *    in app/globals.css removes Edge's native icon so only this one
 *    ever renders.
 */
const PasswordInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <input {...props} ref={ref} type={visible ? "text" : "password"} className={`${className} pr-10`} />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-0.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-text-secondary hover:text-primary transition"
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
