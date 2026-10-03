# Firebase Auth emails for Audityxe

Everything to configure in **Firebase Console → Authentication → Templates**. Firebase only lets you
edit the *message body* of the **Password reset** template; for the other two templates you can
change the sender, reply-to and subject line (their body is Firebase's own).

## 1. Action URL (one URL for the whole project)

Firebase has a **single** action URL. Set it once (pencil icon on any template → **Customize action URL**):

```
https://audityxe.xyz/auth/action
```

Enter the base URL only — **no** `?mode=…&oobCode=…`. Firebase appends those itself (plus `apiKey`,
`lang` and, if set, `continueUrl`), so each template's `%LINK%` becomes:

| Template | `%LINK%` the user receives |
| --- | --- |
| Email address verification | `https://audityxe.xyz/auth/action?mode=verifyEmail&oobCode=<code>&apiKey=<key>&lang=<lang>` |
| Password reset | `https://audityxe.xyz/auth/action?mode=resetPassword&oobCode=<code>&apiKey=<key>&lang=<lang>` |
| Email address change (revert) | `https://audityxe.xyz/auth/action?mode=recoverEmail&oobCode=<code>&apiKey=<key>&lang=<lang>` |
| Verify-and-change email | `https://audityxe.xyz/auth/action?mode=verifyAndChangeEmail&oobCode=<code>&apiKey=<key>&lang=<lang>` |

The `/__/auth/action` form works too (`https://audityxe.xyz/__/auth/action`). The page that handles
all of these is `app/auth/action/page.tsx`.

### "An error occurred updating action URL"

1. **The domain must be authorized.** Authentication → Settings → **Authorized domains** → Add
   domain → `audityxe.xyz` (domain only: no `https://`, no path). Check it from your machine:

   ```
   node scripts/check-firebase-domain.mjs
   ```

   It prints the authorized-domain list and whether `audityxe.xyz` is in it.
2. **If it still fails** the console is hiding the real reason behind a generic message. Get the
   exact one from the API (needs the Google Cloud CLI, signed in as a project owner):

   ```bash
   curl -X PATCH \
     -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     -H "Content-Type: application/json" \
     -H "X-Goog-User-Project: audityxe" \
     "https://identitytoolkit.googleapis.com/admin/v2/projects/audityxe/config?updateMask=notification.sendEmail.callbackUri" \
     -d '{"notification":{"sendEmail":{"callbackUri":"https://audityxe.xyz/auth/action"}}}'
   ```

   A success returns the updated config. A failure returns Firebase's actual error message (for
   example `EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`, which Firebase support has to lift on the project).

## 2. Stop the emails going to spam

Firebase's default sender is `noreply@audityxe.firebaseapp.com`, signed by Firebase's shared
domain — mail providers see a sender that doesn't match your brand. Send from your own domain:

For **each** template: pencil icon → **Customize domain** → enter `audityxe.xyz`.

Firebase then shows DNS records. Add them in Cloudflare → DNS and set every one to **DNS only**
(grey cloud, not proxied):

- the **TXT** verification record and the **CNAME** DKIM records exactly as Firebase displays them;
- the **SPF** value. A domain may have only **one** SPF record. If `audityxe.xyz` already has a
  `v=spf1 …` TXT record, merge Firebase's include into it instead of adding a second record;
- a **DMARC** record (not provided by Firebase; start in monitor mode):

  | Type | Name | Value |
  | --- | --- | --- |
  | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:zelvior@proton.me; fo=1` |

  After a couple of weeks of clean reports, tighten it to `p=quarantine`.

Verification can take up to 24 hours. When the Templates tab shows **Verification complete**, click
**Apply Custom Domain**. Then set, on every template:

| Field | Value |
| --- | --- |
| Sender name | `Audityxe` |
| From address | `noreply@audityxe.xyz` |
| Reply-to | `zelvior@proton.me` (a monitored inbox improves trust) |

Subject lines (short, no exclamation marks or ALL CAPS):

| Template | Subject |
| --- | --- |
| Email address verification | `Confirm your email for %APP_NAME%` |
| Password reset | `Reset your %APP_NAME% password` |
| Email address change | `Your %APP_NAME% email address was changed` |

Also: ask early testers to mark the first emails "Not spam" and add the sender to contacts, and
test with a free tool such as mail-tester.com (send a reset email to its address; aim for 9+/10).
A brand-new domain has no sending reputation, so the first days can still land in spam even with
perfect DNS — that improves as real people open the mail.

## 3. Password reset message

Paste [`password-reset.html`](./password-reset.html) into the **Password reset** template's
**Message** field (HTML). It uses only Firebase's placeholders — `%APP_NAME%`, `%EMAIL%`, `%LINK%` —
inline styles, and table layout so it renders the same in Gmail, Outlook and Apple Mail.
