# Firebase Auth emails for Audityxe

Everything to configure in **Firebase Console → Authentication → Templates**. Firebase only lets you
edit the *message body* of the **Password reset** template; for the other two templates you can
change the sender, reply-to and subject line (their body is Firebase's own).

## 1. Action URL (one URL for the whole project)

Firebase has a **single** action URL; changing it on one template changes all of them. Set it once
(pencil icon on any template → **Customize action URL**). Keep the same shape Firebase uses for its
own default (`https://<project>.firebaseapp.com/__/auth/action`) and swap only the domain:

```
https://audityxe.xyz/__/auth/action
```

If the console's field is pre-filled with the query placeholders (as in the default
`…/__/auth/action?mode=action&oobCode=code`), keep them too:

```
https://audityxe.xyz/__/auth/action?mode=action&oobCode=code
```

Both are served by `app/auth/action/page.tsx` (`/__/auth/action` is a rewrite to `/auth/action`,
see `next.config.js`), so **deploy this version before saving** — the URL must already resolve.
The `mode=action` / `oobCode=code` part is only a placeholder; Firebase replaces it, so `%LINK%`
becomes:

| Template | `%LINK%` the user receives |
| --- | --- |
| Email address verification | `https://audityxe.xyz/__/auth/action?mode=verifyEmail&oobCode=<code>&apiKey=<key>&lang=<lang>` |
| Password reset | `https://audityxe.xyz/__/auth/action?mode=resetPassword&oobCode=<code>&apiKey=<key>&lang=<lang>` |
| Email address change (revert) | `https://audityxe.xyz/__/auth/action?mode=recoverEmail&oobCode=<code>&apiKey=<key>&lang=<lang>` |
| Verify-and-change email | `https://audityxe.xyz/__/auth/action?mode=verifyAndChangeEmail&oobCode=<code>&apiKey=<key>&lang=<lang>` |

### "An error occurred updating action URL"

The console hides the real reason behind that generic message, so read it instead of guessing:

1. Open the Firebase console in Chrome, press **F12 → Network**, tick **Preserve log**, then click
   **Save** on the action URL dialog.
2. Find the request that turns red (a `config` / `updateConfig` / `setAccountInfo` call to
   `identitytoolkit…googleapis.com` or `firebase.google.com`), open **Response**, and read the
   `error.message`. It names the exact cause, for example:
   - `INVALID_ARGUMENT` / a message about the URL → the value's shape is wrong (use the forms above);
   - a message about domain authorization → add the domain under Authentication → Settings →
     **Authorized domains** (domain only, no `https://`, no path) and run
     `node scripts/check-firebase-domain.mjs` to confirm it's listed;
   - `EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED` → the project itself refuses template-URL changes;
     Firebase support has to lift it (and you can still keep the default action URL and rely on
     the custom sender domain below).
3. No browser tools? The same call from a terminal (Google Cloud CLI, signed in as a project
   owner) returns the exact error body:

   ```bash
   curl -X PATCH \
     -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     -H "Content-Type: application/json" \
     -H "X-Goog-User-Project: audityxe" \
     "https://identitytoolkit.googleapis.com/admin/v2/projects/audityxe/config?updateMask=notification.sendEmail.callbackUri" \
     -d '{"notification":{"sendEmail":{"callbackUri":"https://audityxe.xyz/__/auth/action"}}}'
   ```

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
