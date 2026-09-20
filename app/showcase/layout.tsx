import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";

export const metadata: Metadata = {
  ...canonicalMeta("showcase"),
  title: "Showcase — Audityxe",
  description: "Real sites using the Audityxe badge, ownership-verified before listing.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
