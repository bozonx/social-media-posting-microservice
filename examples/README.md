# Examples - Library Mode Usage

Эта директория содержит примеры использования `social-media-posting-microservice` в качестве библиотеки в TypeScript/ESM проектах.

## Базовый пример

Файл: [`library-basic-usage.ts`](./library-basic-usage.ts)

Демонстрирует основные возможности библиотечного режима:
- Создание клиента с программной конфигурацией
- Предпросмотр постов (preview)
- Публикация постов
- Корректное завершение работы (cleanup)
# Examples

This directory contains usage examples for the social-media-posting-microservice.

## Library Mode Usage

The `library-basic-usage.ts` file demonstrates various ways to use this package as a library in your TypeScript projects.

### Running the Example

1. Build the library:
   ```bash
   pnpm build:lib
   ```

2. Run the example (requires Node.js with ESM support):
   ```bash
   node examples/library-basic-usage.ts
   ```

### What's Included

The example demonstrates:

1. **Basic Usage** - Creating a client with default console logger
2. **Custom Logger** - Implementing and using a custom logger
3. **Multiple Accounts** - Managing multiple social media accounts
4. **Error Handling** - Proper error handling patterns

### Quick Start

```typescript
import { createPostingClient } from 'social-media-posting-microservice';

const client = createPostingClient({
  accounts: {
    myBot: {
      platform: 'telegram',
      auth: {
        botToken: 'YOUR_BOT_TOKEN'
      },
      channelId: '@your_channel'
    }
  }
});

// Preview a post
const result = await client.preview({
  account: 'myBot',
  platform: 'telegram',
  body: 'Hello, world!'
});

console.log(result);

// Cleanup
await client.destroy();
```

## Configuration

All configuration is passed programmatically when creating the client. The library does **not** use environment variables or external configuration files - providing complete isolation.

### Available Options

- `accounts` - Account configurations (required)
- `requestTimeoutSecs` - Request timeout in seconds (default: 60)
- `retryAttempts` - Number of retry attempts (default: 3)
- `retryDelayMs` - Delay between retries in ms (default: 1000)
- `idempotencyTtlMinutes` - TTL for idempotency cache (default: 10)
- `logLevel` - Logging level: 'debug' | 'info' | 'warn' | 'error' (default: 'warn')
- `logger` - Custom logger implementation (optional)

### Custom Logger Example

```typescript
import { createPostingClient, ILogger } from 'social-media-posting-microservice';

const myLogger: ILogger = {
  debug: (msg, ctx) => console.log(`[DEBUG] ${msg}`),
  log: (msg, ctx) => console.log(`[INFO] ${msg}`),
  warn: (msg, ctx) => console.warn(`[WARN] ${msg}`),
  error: (msg, trace, ctx) => console.error(`[ERROR] ${msg}`, trace)
};

const client = createPostingClient({
  accounts: { /* ... */ },
  logger: myLogger
});
```

## Features

### Isolation

The library is completely isolated:
- ✅ Uses only the configuration you provide
- ✅ No environment variables are read
- ✅ No external configuration files
- ✅ Multiple instances can coexist independently

### Type Safety

Full TypeScript support with exported types:
- `LibraryConfig` - Configuration interface
- `PostingClient` - Client interface
- `ILogger` - Logger interface
- `PostRequestDto`, `PostResponseDto`, etc.

### Error Handling

The library returns structured error responses instead of throwing exceptions:

```typescript
const result = await client.preview({...});

if ('error' in result) {
  console.error('Error:', result.error, result.message);
} else {
  console.log('Success:', result.detectedType);
}
```

## Additional Resources

- [Main README](../README.md) - Project overview
- [API Documentation](../docs/api.md) - Complete API reference
- [Development Guide](../docs/dev.md) - Development information

## Support

For issues and questions, please open an issue on the GitHub repository.

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
