// Minimal, standalone push-notification service worker for the
// background-audit "notify me when it's ready" flow (see
// lib/push.ts, components/NotifyMeButton.tsx). Deliberately does NOT
// do any asset caching / offline-mode work — that's a separate concern
// this project hasn't opted into, and mixing the two would risk this
// worker serving stale cached pages, which is worse than no service
// worker at all. Its only job is: receive a push, show a notification,
// and take the person to the right report when they tap it.

self.addEventListener("push", (event) => {
  let data = { title: "Audityxe", body: "Your audit is ready.", jobId: "" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Malformed/empty push payload — fall back to the generic message
    // above rather than showing nothing at all.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/logo-mark-192.png",
      badge: "/logo-mark-192.png",
      tag: data.jobId ? `audit-job-${data.jobId}` : "audit-job",
      data: { jobId: data.jobId },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const jobId = event.notification.data && event.notification.data.jobId;
  const url = jobId ? `/?job=${encodeURIComponent(jobId)}` : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
