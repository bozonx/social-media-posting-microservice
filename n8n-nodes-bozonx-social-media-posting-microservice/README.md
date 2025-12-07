# n8n-nodes-bozonx-social-media-posting-microservice

N8N нода для публикации контента в социальные сети через микросервис [Social Media Posting](https://github.com/bozonx/social-media-posting-microservice).

## Возможности

- **Telegram** (VK, Instagram в разработке)
- **Типы постов**: текст, изображение, видео, аудио, альбом, документ, статья, story, опрос
- **Аутентификация**: через предконфигурированные каналы или inline-параметры
- **Медиа**: загрузка по URL, повторное использование через `fileId`, спойлеры
- **Форматы**: HTML, Markdown, plain text с автоконвертацией
- **Идемпотентность**: предотвращение дубликатов через ключи
- **Обработка ошибок**: автоповторы и continue-on-fail

## Установка

### Community Nodes (рекомендуется)

1. **Settings** → **Community Nodes** → **Install**
2. Введите: `n8n-nodes-bozonx-social-media-posting-microservice`
3. Перезапустите n8n

### Вручную

```bash
npm install n8n-nodes-bozonx-social-media-posting-microservice
```

Docker:
```dockerfile
RUN npm install -g n8n-nodes-bozonx-social-media-posting-microservice
```

## Быстрый старт

### 1. Запустите микросервис

```bash
docker run -d \
  --name social-media-posting \
  -p 8080:8080 \
  -v /path/to/config.yaml:/app/config.yaml \
  bozonx/social-media-posting-microservice:latest
```

Проверьте:
```bash
curl http://localhost:8080/api/v1/health
# Ожидается: {"status":"ok"}
```

### 2. Создайте credentials в n8n

1. Создайте **Social Media Posting API** credential
2. **Base URL**: `http://localhost:8080/api/v1` (полный путь с `/api/v1`)
3. **Authentication**: None / Basic Auth / Bearer Token

### 3. Используйте ноду

#### С предконфигурированным каналом:

- **Platform**: `Telegram`
- **Authentication**: `Use Channel from Config`
- **Channel Name**: `my_channel`
- **Post Content**: `Hello, world!`

#### С inline-аутентификацией:

- **Platform**: `Telegram`
- **Authentication**: `Use Inline Auth`
  - **API Key**: `123456:ABC...` (bot token)
  - **Chat ID**: `@mychannel`
- **Post Content**: `Hello, world!`

## Параметры

### Основные

| Параметр | Описание | Значения |
|----------|----------|----------|
| **Platform** | Платформа | `telegram` |
| **Post Content** | Текст поста | До 100,000 символов |
| **Authentication** | Аутентификация | Channel / Inline Auth |

### Дополнительные (Additional Options)

| Параметр | Описание | По умолчанию |
|----------|----------|--------------|
| **Post Type** | Тип поста | `auto` |
| **Body Format** | Формат текста | `text` |
| **Disable Notification** | Без звука уведомления | `false` |
| **Title** | Заголовок | - |
| **Description** | Описание | - |
| **Cover Image** | Обложка | - |
| **Video** | Видео | - |
| **Audio** | Аудио | - |
| **Document** | Документ | - |
| **Media Array** | Массив медиа для альбома | - |
| **Platform Options** | Опции платформы (JSON/YAML) | - |
| **Tags** | Теги через запятую | - |
| **Post Language** | Код языка (en, ru) | - |
| **Mode** | Режим публикации | `publish` |
| **Scheduled At** | Время публикации (ISO 8601) | - |

### Форматы медиа

**URL строка:**
```
https://example.com/image.jpg
```

**Telegram file_id строка:**
```
AgACAgIAAxkBAAIC...
```

**JSON объект:**
```json
{
  "url": "https://example.com/image.jpg",
  "fileId": "AgACAgIAAxkBAAIC...",
  "hasSpoiler": true
}
```

**Свойства:**
- `url`: URL медиафайла
- `fileId`: Telegram file_id для повторного использования
- `hasSpoiler`: Спойлер (только Telegram)

**Media Array** (для альбомов, 2-10 элементов):
```json
["https://example.com/1.jpg", "https://example.com/2.jpg"]
```

или с объектами:
```json
[
  {"url": "https://example.com/1.jpg"},
  {"fileId": "AgACAgIAAxkBAAIC..."}
]
```

### Platform Options (Telegram)

JSON объект:
```json
{
  "parseMode": "HTML",
  "disableNotification": true,
  "disableWebPagePreview": false,
  "protectContent": false,
  "replyToMessageId": 123456,
  "inlineKeyboard": [[{"text": "Открыть", "url": "https://example.com"}]]
}
```

**Опции:**
- `parseMode`: `HTML`, `Markdown`, `MarkdownV2`
- `disableNotification`: отправить без звука
- `disableWebPagePreview`: отключить превью ссылок
- `protectContent`: запретить пересылку
- `replyToMessageId`: ответ на сообщение
- `inlineKeyboard`: inline-кнопки

## Примеры

### Текстовый пост

```
Platform: Telegram
Channel Name: my_channel
Post Content: <b>Привет!</b> Тестовый пост
Body Format: html
```

### Пост с изображением

```
Platform: Telegram
Channel Name: my_channel
Post Content: Смотрите фото!
Cover Image: https://example.com/image.jpg
```

### Альбом

```
Platform: Telegram
Channel Name: my_channel
Post Content: Фотогалерея
Media Array: ["https://example.com/1.jpg", "https://example.com/2.jpg"]
```

### С file_id

```
Platform: Telegram
Channel Name: my_channel
Post Content: Репост видео
Video: BAACAgIAAxkBAAIC4mF9...
```

или:
```
Video: {"fileId": "BAACAgIAAxkBAAIC4mF9..."}
```

### С inline-кнопками

```
Platform: Telegram
Channel Name: my_channel
Post Content: Посетите наш сайт!
Platform Options: {"inlineKeyboard": [[{"text": "Открыть", "url": "https://example.com"}]]}
```

### С идемпотентностью

```
Platform: Telegram
Channel Name: my_channel
Post Content: Важное сообщение
Idempotency Key: unique-key-123
```

Повторный запрос с тем же ключом вернёт результат первой публикации без создания дубликата.

## Обработка ошибок

Включите **Continue On Fail** для продолжения workflow при ошибках.

### Формат ответа с ошибкой

```json
{
  "error": "Сообщение об ошибке",
  "code": "ERROR_CODE",
  "details": {},
  "requestId": "uuid-v4"
}
```

### Коды ошибок

| Код | Описание | Повтор |
|-----|----------|--------|
| `VALIDATION_ERROR` | Неверные параметры | Нет |
| `AUTH_ERROR` | Ошибка аутентификации | Нет |
| `PLATFORM_ERROR` | Ошибка API платформы | Зависит |
| `TIMEOUT_ERROR` | Таймаут | Да |
| `RATE_LIMIT_ERROR` | Превышен лимит | Да |
| `INTERNAL_ERROR` | Внутренняя ошибка | Да |

Микросервис автоматически повторяет запросы при временных ошибках.

## Устранение проблем

### Нода не найдена после установки
1. Перезапустите n8n полностью
2. Проверьте **Settings** → **Community Nodes**
3. Убедитесь в правильности имени пакета

### Ошибка подключения
1. Проверьте доступность микросервиса:
   ```bash
   curl http://localhost:8080/api/v1/health
   ```
2. **Base URL** должен включать `/api/v1`
3. Проверьте доступность порта 8080
4. Проверьте сеть (Docker networks, firewall)

### Ошибка аутентификации

**Channel Mode:**
- Проверьте наличие канала в `config.yaml` микросервиса
- Проверьте подстановку переменных окружения

**Inline Auth:**
- Формат bot token: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
- Формат chat ID: `@channelname` или `-100123456789`
- Бот должен быть админом канала
- Бот должен быть добавлен в канал

### Ошибка публикации
1. Проверьте сообщение об ошибке
2. Лимиты Telegram:
   - Текст: 4096 символов
   - Caption: 1024 символа
   - Альбом: 2-10 элементов
   - Размер файла: 50 MB (через URL)
3. URL медиа должны быть публично доступны
4. Проверьте поддерживаемые форматы (JPEG, PNG, MP4)
5. Формат текста должен соответствовать содержимому

## Конфигурация микросервиса

Пример `config.yaml`:

```yaml
channels:
  my_channel:
    platform: telegram
    auth:
      apiKey: ${TELEGRAM_BOT_TOKEN}
      chatId: "@my_channel"
    bodyFormat: html
```

Переменные окружения подставляются через `${VAR_NAME}`.

## Ресурсы

- [Репозиторий микросервиса](https://github.com/bozonx/social-media-posting-microservice)
- [API документация](https://github.com/bozonx/social-media-posting-microservice/blob/main/docs/api.md)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)
- [Telegram Bot API](https://core.telegram.org/bots/api)

## Лицензия

MIT
