import Logo from "@/components/Logo";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-pulseSlow">
          <Logo size={48} />
        </div>
        <p className="text-xs font-mono text-text-secondary">Loading Audityxe…</p>
      </div>
    </div>
  );
}
