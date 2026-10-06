# Email authentication & BIMI (logo avatar) for audityxe.xyz

Goal: Firebase's emails (verification, password reset, email change) land in the inbox and show the
Audityxe logo as the sender avatar. Check the live state any time from your own machine:

```bash
node scripts/check-email-dns.mjs
```

## State found in your live DNS (checked 2026-10-03)

| Item | What's published | Verdict |
| --- | --- | --- |
| SPF | **two** records: `v=spf1 include:_spf.firebasemail.com ~all` **and** `v=spf1 include:_spf.mx.cloudflare.net ~all` | ❌ A domain may have exactly one SPF record. Two = SPF "permerror" — receivers treat SPF as failed for **all** your mail. |
| Firebase domain verification | `firebase=audityxe` | ✅ |
| DKIM | `firebase1/2._domainkey` → `mail-audityxe-xyz.dkim1/2._domainkey.firebasemail.com` | ✅ |
| DMARC | `v=DMARC1; p=quarantine; rua=mailto:zelvior@proton.me; fo=1` | ✅ enforced (pct defaults to 100) — BIMI-eligible |
| BIMI | `v=BIMI1;⏎l=https://audityxe.xyz/audityxelogo.svg;` | ❌ the TXT value contains a **line break**, and there is no `a=` tag |
| Mail routing | MX → Cloudflare Email Routing | ℹ️ explains the second SPF record |

## Fix 1 — one SPF record (do this first)

In Cloudflare → DNS, **delete both** SPF TXT records on `audityxe.xyz` and add one:

| Type | Name | Content |
| --- | --- | --- |
| TXT | `@` | `v=spf1 include:_spf.mx.cloudflare.net include:_spf.firebasemail.com ~all` |

(Leave `google-site-verification=…` and `firebase=audityxe` — they are different TXT records, not SPF.)

## Fix 2 — one-line BIMI record

Edit the `default._bimi` TXT record so the value is a single line (no Enter key in the middle):

| Type | Name | Content |
| --- | --- | --- |
| TXT | `default._bimi` | `v=BIMI1; l=https://audityxe.xyz/audityxelogo.svg; a=` |

## Fix 3 — deploy the logo

`public/audityxelogo.svg` is the BIMI-compliant file (SVG Tiny Portable/Secure: `version="1.2"`,
`baseProfile="tiny-ps"`, `<title>`, square, solid background, no scripts/styles/images, 6 KB). It is
served at exactly the URL in your BIMI record. The original artwork stays in the repo root as
`audityxelogo.svg`; regenerate the compliant file from it with `node scripts/make-bimi-svg.mjs`
(it scales the mark to 80% so a circular avatar crop never clips it).

After deploying, check it: `node scripts/validate-bimi-svg.mjs https://audityxe.xyz/audityxelogo.svg`.
It must answer **200 directly** (no redirect) with `Content-Type: image/svg+xml`. Then confirm with the
official inspector at bimigroup.org (BIMI Inspector).

## Fix 4 — confirm Firebase is really sending from your domain

Open one of the emails Firebase sent you → **Show original** (Gmail). You want:

- `From: noreply@audityxe.xyz` (if it still says `@audityxe.firebaseapp.com`, go to Authentication →
  Templates → each template → **Apply custom domain**);
- `DKIM: PASS … d=audityxe.xyz`, `SPF: PASS`, `DMARC: PASS`.

DMARC is already `p=quarantine`, so any mail that fails both SPF and DKIM alignment goes to spam —
this is the most likely reason Firebase mail has been landing in spam. Fix 1 repairs SPF; the DKIM
CNAMEs you added repair the rest once the custom domain is applied.

## The part DNS cannot do: the certificate (Gmail & Apple Mail)

BIMI records and a perfect SVG are necessary but **not sufficient** for the avatar to appear in
Gmail or Apple Mail:

| Mailbox | Needs |
| --- | --- |
| **Gmail** | a **VMC** (logo + blue check) or **CMC** (logo only) certificate referenced in `a=` |
| **Apple Mail** | a **VMC** backed by a registered trademark |
| Yahoo / AOL and some smaller providers | can show a self-asserted logo (`a=` empty) |

- **VMC** needs a **registered trademark** of the logo (ask the certificate authority whether your
  country's trademark office is accepted).
- **CMC** is for unregistered logos but requires proof the logo has been in use for about **12
  months** — Audityxe launched in 2026, so it may not qualify yet.
- Certificates come from a Mark Verifying Authority (e.g. DigiCert, Entrust, GlobalSign, SSL.com) and
  typically cost on the order of **$1,000+ per year**.

When you have the `.pem`, put it in `public/` (e.g. `public/audityxe-vmc.pem`), deploy, and change the
record to:

```
v=BIMI1; l=https://audityxe.xyz/audityxelogo.svg; a=https://audityxe.xyz/audityxe-vmc.pem
```

Until then, no change to DNS can make Gmail show the logo for Firebase mail — that's Gmail's rule,
not a misconfiguration.

## Optional hardening

- Add a TLS reporting address: TXT `_smtp._tls` = `v=TLSRPTv1; rua=mailto:zelvior@proton.me`.
- MTA-STS only matters for *inbound* mail security. Your inbound mail is handled by Cloudflare Email
  Routing, so skip it unless you have a reason.
- Keep `rua=` pointed at a mailbox you read (or a DMARC report service) — the XML reports show every
  service that sends as `@audityxe.xyz`, which is how you'd spot a sender that fails alignment.
