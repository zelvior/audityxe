import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";

export const metadata: Metadata = {
  ...canonicalMeta("badge"),
  title: "Embeddable Trust Badge — Audityxe",
  description: "Add a live, verifiable Audityxe score badge to your site.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
