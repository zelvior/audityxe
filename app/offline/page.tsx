import { WifiOff } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OfflineGame from "@/components/OfflineGame";

export default function OfflinePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-card glass flex items-center justify-center mx-auto mb-6">
            <WifiOff size={28} className="text-text-secondary" />
          </div>
          <p className="font-mono text-xs text-text-secondary mb-2">NO CONNECTION</p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl mb-3">
            Audityxe needs a network to audit anything.
          </h1>
          <p className="text-sm sm:text-base text-text-secondary mb-8">
            Reconnect and reload. Meanwhile, here's something to do.
          </p>
          <OfflineGame />
        </div>
      </div>
      <Footer />
    </main>
  );
}
