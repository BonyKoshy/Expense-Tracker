// FinTrack Service Worker Notification Handler
// Enables Android & desktop notification clicks to focus or open the FinTrack app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // If action button was clicked or normal click
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow("/");
        }
      }),
  );
});
