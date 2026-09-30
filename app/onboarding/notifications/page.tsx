import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NotificationsStep from "./NotificationsStep";

export const metadata: Metadata = {
  ...canonicalMeta("onboarding/notifications"),
  title: "Enable Notifications — Audityxe Onboarding",
  description: "Get notified every time your Audityxe audit completes.",
  robots: { index: false, follow: true },
};

export default function OnboardingNotificationsPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <NotificationsStep />
      </div>
      <Footer />
    </main>
  );
}
