import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";

export const metadata: Metadata = {
  ...canonicalMeta("contact"),
  title: "Contact — Audityxe",
  description: "Get in touch with the Audityxe team.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
