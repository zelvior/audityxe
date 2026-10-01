import type { Metadata } from "next";
import { noindexMeta } from "@/lib/seo";

export const metadata: Metadata = {
  ...noindexMeta("login"),
  title: "Log In — Audityxe",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
