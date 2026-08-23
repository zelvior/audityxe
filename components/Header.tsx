"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut, ChevronDown } from "lucide-react";
import Logo from "./Logo";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="px-4 sm:px-6 py-4 sm:py-5">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Logo size={32} />
          <span className="font-display font-bold text-lg tracking-tight">Audityxe</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/pricing"
            className="hidden sm:inline-block text-sm font-medium text-text-secondary hover:text-primary transition px-2"
          >
            Pricing
          </Link>

          {loading ? (
            <div className="w-8 h-8 rounded-full bg-surface2 animate-pulse" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full glass hover:border-white/20 transition"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-display font-bold shrink-0">
                  {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
                </div>
                <ChevronDown size={13} className="text-text-secondary" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 glass rounded-xl py-1.5 z-20">
                  <p className="px-3.5 py-2 text-xs text-text-secondary truncate border-b border-border/60 mb-1">
                    {user.email}
                  </p>
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-sm hover:bg-white/5 transition"
                  >
                    <User size={14} /> Account
                  </Link>
                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      await signOut();
                      router.push("/");
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-rose hover:bg-rose/10 transition"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium px-3.5 sm:px-4 py-2 rounded-full glass hover:text-primary transition"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="hidden sm:inline-block text-sm font-semibold px-4 py-2 rounded-full bg-gradient-to-r from-primary to-accent hover:brightness-110 transition"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
