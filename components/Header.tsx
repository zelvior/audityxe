import { Radar } from "lucide-react";

export default function Header() {
  return (
    <header className="px-4 sm:px-6 py-4 sm:py-5">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Radar size={16} />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">Audityxe</span>
        </div>
        <a
          href="#"
          className="text-sm font-medium px-4 py-2 rounded-full glass hover:text-primary transition"
        >
          Sign in
        </a>
      </div>
    </header>
  );
}
