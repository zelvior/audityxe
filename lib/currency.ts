"use client";

import { useEffect, useState } from "react";

export interface CurrencyInfo {
  currencyCode: string;
  locale: string;
  rate: number; // multiply a USD amount by this to get the local amount
  loading: boolean;
  isFallback: boolean;
}

const FALLBACK: CurrencyInfo = {
  currencyCode: "USD",
  locale: "en-US",
  rate: 1,
  loading: false,
  isFallback: true,
};

/**
 * Detects the visitor's likely currency from their browser locale (free,
 * instant, no network call) and — best effort — refines it with a real
 * free geolocation lookup (ipapi.co) and a real free exchange-rate feed
 * (exchangerate-api.com's open/no-key endpoint). Both are public, keyless
 * APIs; if either is unreachable or rate-limited, pricing silently stays
 * in USD rather than showing a broken number.
 */
export function useCurrency(): CurrencyInfo {
  const [info, setInfo] = useState<CurrencyInfo>({ ...FALLBACK, loading: true });

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      // Fast, free, offline guess from the browser's own locale first —
      // gives an immediate (if approximate) currency before any network
      // round-trip resolves.
      try {
        const locale = navigator.language || "en-US";
        const localeCurrency = new Intl.NumberFormat(locale, { style: "currency", currency: "USD" })
          .resolvedOptions().currency;
        if (localeCurrency && !cancelled) {
          setInfo((prev) => ({ ...prev, locale }));
        }
      } catch {
        // ignore — keep USD fallback
      }

      // Real free geolocation (no key) → real country/currency.
      let currencyCode = "USD";
      let locale = navigator.language || "en-US";
      try {
        const geoRes = await fetch("https://ipapi.co/json/");
        if (geoRes.ok) {
          const geo = await geoRes.json();
          if (geo && typeof geo.currency === "string" && geo.currency.length === 3) {
            currencyCode = geo.currency;
          }
          if (geo && typeof geo.country_code === "string") {
            locale = `${navigator.language?.split("-")[0] || "en"}-${geo.country_code}`;
          }
        }
      } catch {
        if (!cancelled) setInfo({ ...FALLBACK, loading: false });
        return;
      }

      if (currencyCode === "USD") {
        if (!cancelled) setInfo({ currencyCode: "USD", locale, rate: 1, loading: false, isFallback: false });
        return;
      }

      // Real free exchange rate (no key) → real conversion multiplier.
      try {
        const fxRes = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
        if (!fxRes.ok) throw new Error("fx unavailable");
        const fx = await fxRes.json();
        const rate = fx?.rates?.[currencyCode];
        if (typeof rate === "number" && rate > 0 && !cancelled) {
          setInfo({ currencyCode, locale, rate, loading: false, isFallback: false });
        } else if (!cancelled) {
          setInfo({ ...FALLBACK, loading: false });
        }
      } catch {
        if (!cancelled) setInfo({ ...FALLBACK, loading: false });
      }
    }

    detect();
    return () => {
      cancelled = true;
    };
  }, []);

  return info;
}

/** Formats a USD amount into the detected local currency, falling back
 * to a plain "$X" string if formatting fails for any reason. */
export function formatPrice(usdAmount: number, info: CurrencyInfo): string {
  if (usdAmount === 0) return "$0";
  try {
    const converted = usdAmount * info.rate;
    return new Intl.NumberFormat(info.locale, {
      style: "currency",
      currency: info.currencyCode,
      maximumFractionDigits: converted >= 100 ? 0 : 2,
    }).format(converted);
  } catch {
    return `$${usdAmount}`;
  }
}
