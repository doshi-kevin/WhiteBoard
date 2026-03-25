// Whiteboard — Service Worker for Web Push Notifications

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Whiteboard Reminder", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Whiteboard Reminder", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "whiteboard",
      data: { url: data.url || "/" },
      requireInteraction: true,
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        const existing = windowClients.find(
          (w) => w.url.includes(self.location.origin) && "focus" in w
        );
        if (existing) return existing.focus();
        return clients.openWindow(url);
      })
  );
});
