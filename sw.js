/* 오프라인용 서비스 워커.
   앱 껍데기만 캐시한다. 기록은 localStorage에 있으니 네트워크와 무관하게 살아 있다.
   새 버전이 배포되면 즉시 갈아끼운다 — 폰에 옛날 화면이 붙어 있는 게 더 나쁘다. */

const CACHE = "suneung-shell-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.add("./")).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  // 페이지 이동은 네트워크 우선, 끊기면 캐시된 껍데기
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./", copy));
          return res;
        })
        .catch(() => caches.match("./").then((r) => r ?? Response.error())),
    );
    return;
  }

  // 정적 자원은 캐시 우선
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ??
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
