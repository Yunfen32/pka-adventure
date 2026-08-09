/* ============================================================
 * Service Worker —— 宝可梦 AI 文字冒险
 * 策略：
 *   - 应用外壳（HTML/JS/CSS/图标）：缓存优先 + 后台更新
 *   - pokeapi.co API：stale-while-revalidate（离线可看已遇宝可梦）
 *   - 宝可梦图片 CDN：缓存优先（内容不变）
 *   - AI API（POST）：不拦截，直接走网络
 * ============================================================ */

const VERSION = 'pka-v1.5.0';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

/* 应用外壳：安装时全部预缓存 */
const SHELL_ASSETS = [
  './',
  './index.html',
  './assets/app.js',
  './assets/app.css',
  './assets/mobile.css',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      /* 强制走网络预缓存，避免 HTTP 磁盘缓存把旧资源塞进来 */
      .then((cache) => Promise.all(
        SHELL_ASSETS.map((url) =>
          fetch(url, { cache: 'reload' })
            .then((resp) => { if (resp && resp.ok) return cache.put(url, resp); })
            .catch(() => {})
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  /* 只处理 GET；AI API 的 POST 等直接放行 */
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  /* 1. 同源请求（应用外壳）：缓存优先，后台更新 */
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((cached) => {
        const networkFetch = fetch(request).then((resp) => {
          if (resp && resp.ok) {
            const clone = resp.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(request, clone));
          }
          return resp;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  /* 2. pokeapi.co 数据接口：stale-while-revalidate */
  if (url.hostname === 'pokeapi.co') {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const networkFetch = fetch(request).then((resp) => {
            if (resp && resp.ok) cache.put(request, resp.clone());
            return resp;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  /* 3. 图片 CDN（jsdelivr 等）：缓存优先（内容永久不变） */
  if (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'raw.githubusercontent.com') {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((resp) => {
            if (resp && (resp.ok || resp.type === 'opaque')) {
              cache.put(request, resp.clone());
            }
            return resp;
          });
        })
      )
    );
    return;
  }

  /* 其他跨域请求不拦截 */
});
