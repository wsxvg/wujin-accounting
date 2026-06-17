// Service Worker - 离线缓存
const CACHE_NAME = 'wujin-v2';

// 请求拦截
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Supabase API 请求不缓存，直接走网络
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // HTML 页面：网络优先（保证拿到最新版本）
  if (event.request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === '') {
    event.respondWith(
      fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // 其他资源（CSS/JS/图片）：缓存优先，后台更新
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// 安装：跳过等待，立即激活
self.addEventListener('install', () => self.skipWaiting());

// 激活：清理旧缓存，立即接管
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});
