"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { PLANS } from "@/lib/plans";

export default function PricingPage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-xs font-mono text-text-secondary mb-3">PRICING</p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl tracking-tight text-gradient mb-4">
              Simple, usage-based plans
            </h1>
            <p className="text-text-secondary text-sm sm:text-base max-w-lg mx-auto">
              Every plan gets the full audit engine. Higher tiers just get more audits per day and
              deeper competitor analysis.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
            {Object.values(PLANS).map((plan) => (
              <div
                key={plan.id}
                className={`glass rounded-2xl p-6 sm:p-7 flex flex-col ${
                  plan.id === "standard" ? "border-primary/50 shadow-glow" : ""
                }`}
              >
                {plan.id === "standard" && (
                  <span className="self-start text-[10px] font-mono px-2.5 py-1 rounded-full bg-primary/20 text-primary mb-3">
                    MOST POPULAR
                  </span>
                )}
                <h2 className="font-display font-bold text-xl mb-1">{plan.name}</h2>
                <p className="text-3xl font-display font-bold mb-1">{plan.price}</p>
                <p className="text-xs text-text-secondary mb-6">{plan.tagline}</p>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                      <Check size={15} className="text-emerald mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {plan.id === "free" ? (
                  <Link
                    href={user ? "/account" : "/register"}
                    className="w-full text-center py-3 rounded-xl glass font-semibold text-sm hover:border-white/20 transition"
                  >
                    {user ? "You're on Free" : "Get started free"}
                  </Link>
                ) : (
                  <Link
                    href="/contact"
                    className="w-full text-center py-3 rounded-xl bg-gradient-to-r from-primary to-accent font-semibold text-sm hover:brightness-110 transition"
                  >
                    Contact sales
                  </Link>
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-text-secondary/70 mt-10">
            Limits reset daily at midnight UTC. Need a custom plan or higher volume?{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Get in touch
            </Link>
            .
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
