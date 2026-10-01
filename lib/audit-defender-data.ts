export type IssueCategory = "SEO" | "Performance" | "Security" | "Accessibility" | "UI/UX" | "Mobile";
export type Difficulty = "easy" | "medium" | "hard";

export interface AuditIssue {
  id: string;
  category: IssueCategory;
  title: string;
  description: string;
  correctFix: string;
  wrongFixes: [string, string];
  difficulty: Difficulty;
  points: number;
}

const POINTS: Record<Difficulty, number> = { easy: 10, medium: 15, hard: 25 };

function issue(
  id: string,
  category: IssueCategory,
  title: string,
  description: string,
  correctFix: string,
  wrongFixes: [string, string],
  difficulty: Difficulty
): AuditIssue {
  return { id, category, title, description, correctFix, wrongFixes, difficulty, points: POINTS[difficulty] };
}

/**
 * The full issue pool for Audit Defender. Each is a real, correct
 * audit fact — these mirror the kind of findings the actual Audityxe
 * engine reports, just turned into a multiple-choice format rather
 * than freeform text (freeform matching against a "correctFix" string
 * is both unreliable to grade and inaccessible to type on mobile/
 * touch — multiple choice keeps it keyboard- and touch-operable).
 */
export const ISSUE_POOL: AuditIssue[] = [
  issue("seo-1", "SEO", "Missing page title", "The page has no <title> tag, so search results show a blank or auto-generated title.", "Add a unique, descriptive <title> tag", ["Add more keywords to the body text", "Increase the font size of the H1"], "easy"),
  issue("seo-2", "SEO", "Multiple H1 tags", "The page uses three separate <h1> elements, confusing the page's topic hierarchy for search engines.", "Use exactly one H1 per page, then H2/H3 for subsections", ["Delete all headings", "Make every heading an H1 for emphasis"], "medium"),
  issue("seo-3", "SEO", "Missing meta description", "There's no meta description, so search engines generate a random snippet from page text instead.", "Add a concise, unique meta description", ["Add a meta keywords tag instead", "Repeat the title tag as the description"], "easy"),
  issue("seo-4", "SEO", "No canonical URL", "The page is reachable via multiple URL variants with no canonical tag, risking duplicate-content dilution.", "Add a self-referencing <link rel=\"canonical\">", ["Block the duplicate URLs in robots.txt", "Redirect every page to the homepage"], "medium"),
  issue("seo-5", "SEO", "robots.txt blocks the whole site", "robots.txt contains \"Disallow: /\" under User-agent: *, blocking every crawler from indexing anything.", "Remove the blanket Disallow rule", ["Add more Allow rules on top of it", "Delete robots.txt entirely"], "hard"),
  issue("seo-6", "SEO", "No structured data", "There's no JSON-LD structured data, so the page misses out on rich results (star ratings, breadcrumbs, etc.).", "Add relevant JSON-LD (e.g. Organization or Product schema)", ["Add more image alt text", "Increase keyword density"], "medium"),
  issue("perf-1", "Performance", "Unoptimized hero image", "The homepage hero image is a 4.8MB uncompressed PNG, dominating the page's load time.", "Compress and serve as WebP/AVIF at the display size", ["Add a loading spinner over it", "Move the image to the footer"], "easy"),
  issue("perf-2", "Performance", "Render-blocking script in <head>", "A large third-party script loads synchronously in <head>, delaying first paint.", "Add defer/async, or move the script before </body>", ["Minify the HTML instead", "Move the script into a CSS file"], "medium"),
  issue("perf-3", "Performance", "No caching headers", "Static assets are served with no Cache-Control header, forcing a full re-download on every visit.", "Set long max-age Cache-Control on static assets", ["Serve every asset from a single file", "Disable the browser's cache via meta tag"], "medium"),
  issue("perf-4", "Performance", "Layout shift from unsized image", "An image has no width/height set, so the layout jumps once it finishes loading (poor CLS).", "Set explicit width/height (or aspect-ratio) on the image", ["Load the image after a 2-second delay", "Replace the image with an emoji"], "easy"),
  issue("perf-5", "Performance", "Web fonts block text rendering", "Custom fonts load with no font-display strategy, leaving text invisible until they arrive.", "Add font-display: swap to the @font-face rule", ["Remove all custom fonts", "Load the font twice for redundancy"], "medium"),
  issue("sec-1", "Security", "Site served over HTTP", "The site loads over plain HTTP, so traffic (including any login form) isn't encrypted.", "Serve the site over HTTPS with a valid TLS certificate", ["Add a \"secure site\" badge image to the footer", "Password-protect the login page"], "hard"),
  issue("sec-2", "Security", "Missing security headers", "The response has no Content-Security-Policy or X-Frame-Options headers, leaving it open to clickjacking/XSS.", "Add CSP, X-Frame-Options, and related security headers", ["Add a cookie consent banner", "Rename the admin login URL"], "medium"),
  issue("sec-3", "Security", "Outdated TLS protocol", "The server still accepts TLS 1.0, a protocol version with known weaknesses.", "Disable TLS 1.0/1.1 and require TLS 1.2+", ["Switch from HTTPS back to HTTP", "Add a CAPTCHA to the login form"], "hard"),
  issue("sec-4", "Security", "Mixed content warning", "An HTTPS page loads one script over plain HTTP, triggering a mixed-content browser warning.", "Load every asset over HTTPS (protocol-relative or explicit)", ["Ignore it — browsers block it automatically", "Move the script to a different page"], "medium"),
  issue("sec-5", "Security", "No SPF/DKIM on the domain", "The domain has no SPF or DKIM records, making it easy for attackers to spoof emails from it.", "Publish SPF and DKIM DNS records for the domain", ["Turn off the contact form", "Add a CAPTCHA to the homepage"], "hard"),
  issue("a11y-1", "Accessibility", "Image missing alt text", "A product image has no alt attribute, so screen-reader users get no description of it.", "Add descriptive alt text to the image", ["Add a tooltip on hover", "Increase the image's file size"], "easy"),
  issue("a11y-2", "Accessibility", "Low text contrast", "Gray body text (#999) on a white background fails WCAG's 4.5:1 contrast ratio.", "Darken the text color to meet 4.5:1 contrast", ["Increase the font size only", "Add a text-shadow for emphasis"], "medium"),
  issue("a11y-3", "Accessibility", "Form input missing a label", "A search input has only a placeholder, no <label>, so screen readers announce nothing useful.", "Add a proper <label> (visually hidden if needed)", ["Make the placeholder text longer", "Add a tooltip with instructions"], "easy"),
  issue("a11y-4", "Accessibility", "Focus outline removed", "CSS sets outline: none on all buttons with no visible replacement, so keyboard users can't see what's focused.", "Add a visible :focus-visible style (border/box-shadow)", ["Remove keyboard navigation entirely", "Only support mouse users"], "medium"),
  issue("a11y-5", "Accessibility", "Video with no captions", "An embedded product video has no captions or transcript available.", "Add captions and a text transcript", ["Add a volume slider", "Autoplay the video muted"], "medium"),
  issue("ux-1", "UI/UX", "Call-to-action buried below the fold", "The primary \"Sign up\" button only appears after scrolling three full screens down.", "Move a clear primary CTA above the fold", ["Make the logo bigger", "Add a popup on page load instead"], "easy"),
  issue("ux-2", "UI/UX", "Inconsistent button styles", "Five different button styles are used for the same \"primary action\" across the site.", "Standardize on one primary-button style via design tokens", ["Add animation to make them stand out", "Use a different color on every page"], "medium"),
  issue("ux-3", "UI/UX", "No error message on failed form submit", "Submitting an invalid form just silently does nothing, with no feedback to the user.", "Show a clear, specific inline error message", ["Disable the submit button permanently", "Redirect to the homepage on any error"], "easy"),
  issue("ux-4", "UI/UX", "Confusing navigation labels", "Nav items are labeled \"Solutions,\" \"Platform,\" and \"Product\" for what are actually the same page.", "Use one clear, distinct label per destination", ["Remove the navigation entirely", "Add a search bar instead of fixing labels"], "medium"),
  issue("ux-5", "UI/UX", "Auto-playing sound", "A background video autoplays with sound on page load, without user interaction.", "Autoplay muted only, and let the user opt in to sound", ["Increase the default volume", "Add a second video"], "medium"),
  issue("mob-1", "Mobile", "Text too small on mobile", "Body text renders at 10px on mobile viewports, well under the ~16px readability baseline.", "Set a readable base font size (~16px) for mobile", ["Zoom is disabled, so it's fine", "Rely on the user's browser zoom"], "easy"),
  issue("mob-2", "Mobile", "Tap targets too small", "Nav icons are 20×20px and packed tightly, well under the ~44px touch-target guideline.", "Increase tap targets to at least ~44×44px with spacing", ["Add a tooltip explaining each icon", "Make them only accessible via keyboard"], "medium"),
  issue("mob-3", "Mobile", "Horizontal scroll on mobile", "A fixed-width 1200px table forces horizontal scrolling on a 375px-wide phone screen.", "Make the layout responsive (fluid width or a mobile-friendly table pattern)", ["Shrink all text until it fits", "Hide the table on mobile with no alternative"], "medium"),
  issue("mob-4", "Mobile", "Missing viewport meta tag", "The page has no <meta name=\"viewport\">, so mobile browsers render it zoomed out at desktop width.", "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">", ["Build a separate m.site.com subdomain", "Disable pinch-zoom instead"], "easy"),
  issue("mob-5", "Mobile", "Intrusive interstitial on mobile", "A full-screen app-install popup covers the content the instant a mobile visitor lands on the page.", "Remove or significantly shrink the interstitial on entry", ["Make the close button smaller", "Add a second popup asking why they closed it"], "medium"),
  issue("seo-7", "SEO", "Broken internal links", "Several nav links point to pages that now 404, wasting crawl budget and frustrating visitors.", "Fix or remove the broken links", ["Redirect every broken link to the homepage", "Add a custom 404 page and stop there"], "easy"),
  issue("perf-6", "Performance", "Too many web fonts loaded", "The page loads 6 font weights across 3 font families, most never used.", "Trim to the font weights actually used on the page", ["Load all fonts locally instead of a CDN", "Convert all text to images"], "medium"),
];
