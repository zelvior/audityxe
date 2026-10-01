import type { Metadata } from "next";
import { noindexMeta } from "@/lib/seo";

export const metadata: Metadata = {
  ...noindexMeta("bulk"),
  title: "Bulk Audit — Audityxe",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
