"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Send } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const CONTACT_EMAIL = "zelvior@proton.me";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Audityxe contact from ${name || "website visitor"}`);
    const body = encodeURIComponent(`${message}\n\n— ${name || "Anonymous"} (${email || "no email given"})`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-lg mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary hover:text-primary transition mb-6 sm:mb-8"
          >
            <ArrowLeft size={14} /> Back to Audityxe
          </Link>

          <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl tracking-tight mb-2">
            Contact
          </h1>
          <p className="text-sm sm:text-base text-text-secondary mb-8">
            Questions, bug reports, or feedback on an audit result — send it over and we'll get
            back to you.
          </p>

          <div className="glass rounded-card p-5 sm:p-6 mb-6 flex items-center gap-3">
            <Mail size={18} className="text-primary shrink-0" />
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm sm:text-base font-mono break-all hover:text-primary transition">
              {CONTACT_EMAIL}
            </a>
          </div>

          <form onSubmit={handleSubmit} className="glass rounded-card p-5 sm:p-6 space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-mono text-text-secondary mb-1.5">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-surface2 border border-border rounded-card px-3.5 py-2.5 text-sm outline-none focus-visible:border-primary"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-mono text-text-secondary mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-surface2 border border-border rounded-card px-3.5 py-2.5 text-sm outline-none focus-visible:border-primary"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-xs font-mono text-text-secondary mb-1.5">
                Message
              </label>
              <textarea
                id="message"
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
                rows={5}
                className="w-full bg-surface2 border border-border rounded-card px-3.5 py-2.5 text-sm outline-none resize-none focus-visible:border-primary"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-card bg-secondary font-semibold text-sm hover:brightness-110 transition"
            >
              <Send size={15} />
              Send message
            </button>
            <p className="text-[11px] text-text-secondary/70 text-center">
              This opens your email client with the message pre-filled.
            </p>
          </form>
        </div>
      </div>
      <Footer />
    </main>
  );
}
