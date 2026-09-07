import type { Metadata } from "next";
import { noindexMeta } from "@/lib/seo";

export const metadata: Metadata = {
  ...noindexMeta("forgot-password"),
  title: "Reset Password — Audityxe",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
