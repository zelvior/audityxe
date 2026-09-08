import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";

export const metadata: Metadata = {
  ...canonicalMeta("pricing"),
  title: "Pricing — Audityxe",
  description: "Simple, transparent pricing. Every plan runs the identical audit engine — the only differences are daily volume and competitor comparisons.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
