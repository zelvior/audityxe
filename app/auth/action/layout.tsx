import type { Metadata } from "next";
import { noindexMeta } from "@/lib/seo";

export const metadata: Metadata = {
  ...noindexMeta("auth/action"),
  title: "Account Action — Audityxe",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
