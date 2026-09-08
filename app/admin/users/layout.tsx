import type { Metadata } from "next";
import { noindexMeta } from "@/lib/seo";

export const metadata: Metadata = {
  ...noindexMeta("admin/users"),
  title: "User Management — Admin — Audityxe",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
