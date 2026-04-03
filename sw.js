/* =============================================
   My Memo - Service Worker
   ============================================= */

const CACHE_NAME = 'my-memo-v1';

// 캐시할 파일 목록
const CACHE_FILES = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/sw-register.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/public/web/variable/pretendardvariable.css',
  '/public/web/variable/woff2/PretendardVariable.woff2',
];

// =============================================
// 설치 — 캐시 파일 저장
// =============================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_FILES))
  );
  // 새 Service Worker 즉시 활성화
  self.skipWaiting();
});

// =============================================
// 활성화 — 이전 캐시 삭제
// =============================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  // 즉시 페이지 제어권 획득
  self.clients.claim();
});

// =============================================
// fetch — Cache First 전략
// 캐시에 있으면 캐시 반환, 없으면 네트워크 요청 후 캐시 저장
// =============================================
self.addEventListener('fetch', event => {
  // POST 등 non-GET 요청은 무시
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // 유효한 응답만 캐시 저장
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return response;
      }).catch(() => {
        // 오프라인 + 캐시 없을 때 index.html 반환 (SPA 폴백)
        return caches.match('/index.html');
      });
    })
  );
});
