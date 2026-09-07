import type { Metadata } from "next";
import { noindexMeta } from "@/lib/seo";

export const metadata: Metadata = {
  ...noindexMeta("verify-email"),
  title: "Verify Email — Audityxe",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
