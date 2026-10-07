// LabLink service worker: shows checkup reminders and opens the app when one is tapped.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url ?? '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin))
      if (open) {
        open.postMessage({ type: 'lablink:open', screen: event.notification.data?.screen })
        return open.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
