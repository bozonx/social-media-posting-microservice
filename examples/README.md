# Examples - Library Mode Usage

Эта директория содержит примеры использования `social-media-posting-microservice` в качестве библиотеки в TypeScript/ESM проектах.

## Базовый пример

Файл: [`library-basic-usage.ts`](./library-basic-usage.ts)

Демонстрирует основные возможности библиотечного режима:
- Создание клиента с программной конфигурацией
- Предпросмотр постов (preview)
- Публикация постов
- Корректное завершение работы (cleanup)

### Запуск примера

```bash
# Из корневой директории проекта
pnpm run build
node --loader ts-node/esm examples/library-basic-usage.ts
```

Или с использованием tsx:

```bash
pnpm add -D tsx
pnpm exec tsx examples/library-basic-usage.ts
```

## Конфигурация

Пример минимальной конфигурации:

```typescript
import { createPostingClient } from 'social-media-posting-microservice';

const client = createPostingClient({
  accounts: {
    myBot: {
      platform: 'telegram',
      auth: {
        botToken: 'YOUR_BOT_TOKEN',
      },
    },
  },
});
```

Пример полной конфигурации:

```typescript
const client = createPostingClient({
  // Обязательно: настройка аккаунтов
  accounts: {
    telegramChannel: {
      platform: 'telegram',
      auth: {
        botToken: 'YOUR_BOT_TOKEN',
      },
      channelId: '@yourchannel',
      maxBody: 4000,
    },
  },
  
  // Опционально: таймауты и повторы
  requestTimeoutSecs: 60,      // Таймаут запроса (по умолчанию: 60)
  retryAttempts: 3,             // Количество повторов (по умолчанию: 3)
  retryDelayMs: 1000,           // Задержка между повторами (по умолчанию: 1000)
  
  // Опционально: идемпотентность
  idempotencyTtlMinutes: 10,    // TTL для кэша идемпотентности (по умолчанию: 10)
  
  // Опционально: уровень логирования
  logLevel: 'info',             // 'debug' | 'info' | 'warn' | 'error' (по умолчанию: 'warn')
});
```

## API клиента

### `client.post(request)`

Публикация поста на платформу.

```typescript
const result = await client.post({
  platform: 'telegram',
  account: 'myBot',
  body: 'Hello, World!',
  type: PostType.POST,
  bodyFormat: BodyFormat.TEXT,
  
  // Опционально: идемпотентность
  idempotencyKey: 'unique-key-001',
  
  // Опционально: медиа
  cover: {
    src: 'https://example.com/image.jpg',
  },
  
  // Опционально: параметры платформы
  options: {
    // telegram-специфичные опции
  },
});

if (result.success) {
  console.log('Post published:', result.data.postId);
  console.log('URL:', result.data.url);
} else {
  console.error('Error:', result.error.message);
}
```

### `client.preview(request)`

Предпросмотр поста без публикации (валидация).

```typescript
const result = await client.preview({
  platform: 'telegram',
  account: 'myBot',
  body: 'Test preview',
  type: PostType.POST,
});

if (result.success && result.data.valid) {
  console.log('Valid post');
  console.log('Detected type:', result.data.detectedType);
  console.log('Converted body:', result.data.convertedBody);
  console.log('Warnings:', result.data.warnings);
} else {
  console.log('Invalid post');
  console.log('Errors:', result.data.errors);
}
```

### `client.destroy()`

Корректное завершение работы и освобождение ресурсов.

```typescript
await client.destroy();
```

## Типы постов

Поддерживаемые типы постов (enum `PostType`):

- `POST` - Текстовый пост
- `IMAGE` - Пост с изображением
- `VIDEO` - Пост с видео
- `AUDIO` - Пост с аудио
- `DOCUMENT` - Пост с документом
- `ALBUM` - Пост с несколькими медиа
- `ARTICLE` - Статья (для платформ, которые поддерживают)
- `AUTO` - Автоматическое определение типа

## Форматы текста

Поддерживаемые форматы (enum `BodyFormat`):

- `TEXT` - Простой текст
- `HTML` - HTML разметка
- `MARKDOWN` - Markdown

## Error Handling

```typescript
try {
  const result = await client.post(request);
  
  if (!result.success) {
    // Обработка ошибок публикации
    console.error('Error code:', result.error.code);
    console.error('Message:', result.error.message);
    console.error('Details:', result.error.details);
  }
} catch (error) {
  // Обработка системных ошибок (например, ошибка конфигурации)
  console.error('System error:', error);
}
```

## Идемпотентность

Используйте `idempotencyKey` для предотвращения дублирования постов:

```typescript
const result = await client.post({
  platform: 'telegram',
  account: 'myBot',
  body: 'Important announcement',
  idempotencyKey: 'announcement-2026-01-07-v1', // Уникальный ключ
});

// При повторном вызове с тем же ключом вернется кэшированный результат
const cachedResult = await client.post({
  platform: 'telegram',
  account: 'myBot',
  body: 'Important announcement',
  idempotencyKey: 'announcement-2026-01-07-v1', // Тот же ключ
});
```

## Дополнительные примеры

Планируется добавить:
- [ ] Пример с множественными аккаунтами
- [ ] Пример с различными типами медиа
- [ ] Пример с обработкой ошибок
- [ ] Пример интеграции с Express/Fastify
- [ ] Пример использования в батч-обработке
