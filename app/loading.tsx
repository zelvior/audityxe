import IsometricLoader from "@/components/IsometricLoader";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4">
        <IsometricLoader size={120} />
        <p className="text-xs font-mono text-text-secondary">Loading Audityxe…</p>
      </div>
    </div>
  );
}
