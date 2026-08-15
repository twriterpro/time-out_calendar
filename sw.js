// ============================================================
// SERVICE WORKER ДЛЯ ОФЛАЙН-РЕЖИМА
// ============================================================
// Разместите этот файл в корне вашего сайта (рядом с index.html)
// и убедитесь, что он доступен по HTTPS.

const CACHE_NAME = 'calendar-cache-v1';
const urlsToCache = [
    './',              // Кэшируем текущую директорию (index.html)
    './index.html',    // Основной файл приложения
    // Если у вас есть отдельные CSS/JS файлы, добавьте их сюда
];

// Установка Service Worker и кэширование основных ресурсов
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Кэшируем ресурсы');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Ошибка при кэшировании:', error);
            })
    );
    // Активируем SW сразу, не дожидаясь закрытия старых вкладок
    self.skipWaiting();
});

// Активация и очистка старых кэшей
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Удаляем старый кэш:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Перехват запросов и стратегия "сначала кэш"
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Возвращаем из кэша
                    return cachedResponse;
                }
                // Если нет в кэше, пробуем сеть
                return fetch(event.request)
                    .then(response => {
                        // Можно динамически кэшировать новые ресурсы
                        // Но для простоты не будем
                        return response;
                    })
                    .catch(() => {
                        // Если сеть недоступна, можно вернуть fallback (например, заглушку)
                        // Для index.html можно вернуть кэшированную версию
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        return new Response('Офлайн', { status: 503 });
                    });
            })
    );
});