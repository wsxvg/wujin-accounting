// Service Worker - 离线缓存
const CACHE_NAME = 'wujin-accounting-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/supabase.js',
  './js/voice.js',
  './js/customer.js',
  './js/record.js',
  './js/app.js',
  './manifest.json'
];

// 安装：缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：缓存优先，网络回退
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Supabase API 请求不缓存，直接走网络
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // 其他请求：缓存优先
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // 只缓存成功响应
        if (!response || response.status !== 200) {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      });
    }).catch(() => {
      // 离线回退
      if (event.request.destination === 'document') {
        return caches.match('./index.html');
      }
    })
  );
});
