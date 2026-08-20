import { Radar } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulseSlow">
          <Radar size={22} />
        </div>
        <p className="text-xs font-mono text-text-secondary">Loading Audityxe…</p>
      </div>
    </div>
  );
}
