/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry } from "serwist";
import { ExpirationPlugin, NetworkFirst, Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    {
      matcher: ({ url, request }) =>
        request.method === "GET" && url.pathname === "/api/tasks/today",
      handler: new NetworkFirst({
        cacheName: "comeback-api-today",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 8,
            maxAgeSeconds: 60 * 60 * 24,
          }),
        ],
      }),
    },
    {
      matcher: ({ url, request }) =>
        request.method === "GET" && url.pathname === "/api/progress",
      handler: new NetworkFirst({
        cacheName: "comeback-api-progress",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 8,
            maxAgeSeconds: 60 * 60 * 24,
          }),
        ],
      }),
    },
    {
      matcher: ({ url, request }) =>
        request.method === "GET" && url.pathname.startsWith("/today"),
      handler: new NetworkFirst({
        cacheName: "comeback-today-page",
        networkTimeoutSeconds: 5,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 4,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; url?: string; tag?: string } = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "ComeBack.ai", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "ComeBack.ai", {
      body: payload.body ?? "Your goals are waiting.",
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      tag: payload.tag ?? "comeback-notification",
      data: { url: payload.url ?? "/today" },
    })
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data?.url as string | undefined) ?? "/today";
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients: readonly WindowClient[]) => {
        for (const client of clients) {
          if (client.url.startsWith(self.location.origin)) {
            return client.focus().then(() => client.navigate(absoluteUrl));
          }
        }
        return self.clients.openWindow(absoluteUrl);
      })
  );
});

export {};
