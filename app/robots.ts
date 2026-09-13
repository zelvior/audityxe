import type { MetadataRoute } from "next";

/**
 * Explicit per-agent rules rather than one bare `userAgent: "*"` block.
 * A wildcard rule alone is enough to *allow* crawling in the strict
 * robots.txt spec, but several AI/LLM crawlers (and third-party
 * "fetch status" checkers, which is what surfaces the
 * `GOOGLE_EXTENDED_OPT_OUT`-style verdict some tools report) treat the
 * *absence* of a named rule for their exact user-agent token as
 * ambiguous and default to the conservative "not explicitly allowed"
 * reading. Listing them by name removes that ambiguity so this content
 * is eligible for Google AI Overviews / SGE and other AI answer
 * engines, not just classic web search.
 */
export default function robots(): MetadataRoute.Robots {
  const aiAndSearchAgents = [
    "Googlebot",
    "Google-Extended", // Gemini / AI Overviews training + grounding
    "GoogleOther",
    "Bingbot",
    "bingbot",
    "DuckDuckBot",
    "GPTBot", // OpenAI
    "ChatGPT-User",
    "OAI-SearchBot",
    "ClaudeBot", // Anthropic
    "anthropic-ai",
    "Claude-Web",
    "PerplexityBot",
    "CCBot", // Common Crawl (feeds many AI training sets)
    "cohere-ai",
    "Applebot",
    "Applebot-Extended",
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...aiAndSearchAgents.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: "https://audityxe.vercel.app/sitemap.xml",
    host: "https://audityxe.vercel.app",
  };
}

/**
 * Next.js's MetadataRoute.Robots type has no `other` field for freeform
 * lines, so llms.txt discovery is added by placing the files at
 * /public/llms.txt and /public/llms-full.txt directly — GEO crawlers
 * (GPTBot, ClaudeBot, PerplexityBot, etc.) check that well-known path
 * convention without needing a robots.txt pointer.
 */
