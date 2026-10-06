"use client";

import { useEffect, useState } from "react";

type Key = "pricingNote" | "footerNote";

let inflight: Promise<Record<string, string>> | null = null;
function loadBlocks(): Promise<Record<string, string>> {
  if (!inflight) {
    inflight = fetch("/api/content")
      .then((r) => (r.ok ? r.json() : { blocks: {} }))
      .then((d) => (d?.blocks && typeof d.blocks === "object" ? d.blocks : {}))
      .catch(() => ({}));
  }
  return inflight;
}

/** Renders an admin-editable plain-text note (Admin → Content). Renders
 * nothing until/unless the admin has written something, so a missing or
 * slow response never shifts the layout or shows placeholder text. */
export default function SiteNote({ id, className }: { id: Key; className?: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    let alive = true;
    loadBlocks().then((b) => alive && setText(typeof b[id] === "string" ? b[id] : ""));
    return () => {
      alive = false;
    };
  }, [id]);
  if (!text) return null;
  return <p className={className}>{text}</p>;
}
