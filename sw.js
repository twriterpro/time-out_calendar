// ============================================================
// SERVICE WORKER ДЛЯ ОФЛАЙН-РЕЖИМА И АВТООБНОВЛЕНИЯ
// ============================================================
// Версия кэша: увеличивайте при каждом значительном обновлении,
// чтобы старый кэш был удалён и не мешал обновлению.
const CACHE_NAME = 'calendar-cache-v3';

// Список ресурсов для предварительного кэширования.
// ВАЖНО: HTML не включаем в предварительный кэш, потому что
// он будет загружаться по сети (network-first) для получения свежей версии.
const urlsToCache = [
    './',                    // корень (но он не критичен)
    // Можно добавить иконки, шрифты и т.д., если они есть.
];

// ============================================================
// УСТАНОВКА SERVICE WORKER
// ============================================================
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Кэшируем базовые ресурсы');
                return cache.addAll(urlsToCache);
            })
            .catch(err => {
                console.error('[SW] Ошибка при кэшировании:', err);
            })
    );
    // Немедленно активируем новый SW, не дожидаясь закрытия старых вкладок
    self.skipWaiting();
});

// ============================================================
// АКТИВАЦИЯ SERVICE WORKER
// ============================================================
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Удаляем все старые версии кэша, кроме текущей
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Удаляем старый кэш:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Берём под контроль все открытые страницы
    self.clients.claim();
});

// ============================================================
// ОБРАБОТКА ЗАПРОСОВ (FETCH)
// ============================================================
self.addEventListener('fetch', event => {
    // Для навигационных запросов (загрузка HTML-страницы)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            // Сначала пробуем сеть, чтобы получить свежий index.html
            fetch(event.request)
                .then(networkResponse => {
                    // Если сеть доступна, обновляем кэш (на случай офлайна в будущем)
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => {
                    // Если сеть недоступна, отдаём из кэша
                    return caches.match(event.request).then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Если и в кэше нет, отдаём заглушку
                        return new Response('Offline', { status: 503 });
                    });
                })
        );
    } else {
        // Для всех остальных запросов (CDN, изображения, стили) используем cache-first
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return fetch(event.request).then(networkResponse => {
                        // Кэшируем успешные ответы для будущего офлайна
                        if (networkResponse.ok) {
                            return caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, networkResponse.clone());
                                return networkResponse;
                            });
                        }
                        return networkResponse;
                    });
                })
        );
    }
});