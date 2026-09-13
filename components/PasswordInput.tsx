"use client";

import { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Drop-in replacement for `<input type="password">` with a show/hide
 * eye toggle. Accepts the same props as a normal input; `className`
 * styles the input itself (the toggle button is absolutely positioned
 * over it), so pass the same classes you'd give a plain input. */
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
          className="absolute right-0 top-0 h-full px-3 flex items-center text-text-secondary hover:text-white"
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
