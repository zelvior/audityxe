import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HomepageSeoContent from "@/components/HomepageSeoContent";

export const metadata: Metadata = {
  title: "Website Audit Guide — Audityxe",
  description:
    "How to audit a website for SEO, performance, accessibility, security and UX, and how Audityxe's scoring works.",
};

export default function GuidePage() {
  return (
    <main>
      <Header />
      <HomepageSeoContent />
      <Footer />
    </main>
  );
}
