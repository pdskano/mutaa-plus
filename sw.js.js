const CACHE_NAME = 'salah-tv-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // نتجاهل طلبات الفيديو (البروكسي و m3u8) حتى لا تمتلىء ذاكرة الهاتف
  if (event.request.url.includes('/api/proxy') || 
      event.request.url.includes('.m3u8') || 
      event.request.url.includes('.ts')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // نُرجع النسخة المخبأة إن وجدت، وإلا نجلبها من الإنترنت
        return response || fetch(event.request);
      })
  );
});