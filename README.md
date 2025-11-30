# Микросервис постинга в социальные сети

Микросервис для публикации контента в социальные сети через единый REST API.

## Текущий статус

✅ **MVP реализован** с поддержкой Telegram

### Реализованные функции:

- ✅ Публикация в Telegram (посты, изображения, видео, альбомы, документы)
- ✅ Конвертация контента (HTML ↔ Markdown ↔ Text)
- ✅ Валидация медиа URL
- ✅ Retry логика с jitter ±20%
- ✅ Загрузка конфига из YAML с подстановкой env variables
- ✅ Поддержка платформо-специфичных параметров

## Быстрый старт

### 1. Установка зависимостей

```bash
pnpm install
```

### 2. Настройка конфигурации

Создайте config.yaml в корне проекта (пример уже есть) и настройте переменные окружения:

```bash
# В .env.production или в переменных системы
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TELEGRAM_CHAT_ID="@your_channel"
export CONFIG_PATH="./config.yaml"
```

### 3. Запуск

```bash
# Разработка
pnpm start:dev

# Production
pnpm build
pnpm start:prod
```

## Пример использования

### Публикация текстового поста в Telegram

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "company_telegram",
    "type": "post",
    "body": "<b>Привет!</b> Это тестовый пост",
    "bodyFormat": "html",
    "platformData": {
      "parseMode": "HTML",
      "disableNotification": false
    }
  }'
```

### Публикация изображения

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "company_telegram",
    "type": "image",
    "body": "Описание изображения",
    "cover": "https://example.com/image.jpg"
  }'
```

### Публикация альбома (карусели)

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "company_telegram",
    "type": "album",
    "body": "Описание альбома",
    "media": [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg"
    ]
  }'
```

## Следующие этапы разработки

### Этап 2: Расширение функциональности

- [ ] **Эндпоинт `/preview`** — валидация и предпросмотр без публикации
- [ ] **Улучшенная обработка ошибок** — более детальные сообщения об ошибках
- [ ] **Логирование** — структурированные логи для всех операций
- [ ] **Документация API** — Swagger/OpenAPI спецификация

### Этап 3: Новые провайдеры

- [ ] **VK Provider** — публикация в ВКонтакте  
- [ ] **Twitter/X Provider** — публикация в Twitter/X
- [ ] **Настройка конфигов** для новых провайдеров

### Этап 4: Дополнительные фичи

- [ ] **Idempotency** — предотвращение дублирования публикаций
- [ ] **Rate limiting на уровне провайдеров** — защита от превышения лимитов API
- [ ] **Webhook callbacks** — уведомления о статусе публикации
- [ ] **Метрики** — Prometheus метрики для мониторинга

### Этап 5: Видео-платформы

- [ ] **YouTube Provider** — загрузка видео на YouTube
- [ ] **Instagram Provider** — посты, stories, reels
- [ ] **TikTok Provider** — короткие видео

### Этап 6: Тестирование

- [ ] **Unit тесты** — для всех сервисов и провайдеров
- [ ] **Integration тесты** — E2E тесты с моками SDK
- [ ] **Тестовая конфигурация** — для CI/CD

### Этап 7: Production-ready

- [ ] **Docker образ** — оптимизация
- [ ] **Kubernetes манифесты** — для deploy
- [ ] **Мониторинг и алерты** — настройка Prometheus + Grafana
- [ ] **Документация** — полное руководство по deploy и эксплуатации

## Архитектура

Микросервис построен на принципах:

- **Stateless** — не хранит состояния между запросами
- **Прокси-режим** — синхронная обработка запрос-ответ
- **Modular** — легко добавлять новые провайдеры
- **Configurable** — гибкая настройка через YAML + env vars

### Модули:

- `app-config` — загрузка и парсинг конфигурации
- `post` — контроллер и сервис публикации
- `providers` — реализации для разных платформ
- `converter` — конвертация форматов контента
- `media` — валидация медиа URL

## Документация

- [PRD](dev_docs/PRD.md) — полное описание требований
- [config.yaml](config.yaml) — пример конфигурации
- [API](docs/api.md) — документация API (TODO)

## Лицензия

MIT
