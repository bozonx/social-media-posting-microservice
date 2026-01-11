# Examples - Library Mode Usage

This directory contains examples of using `social-media-posting-microservice` as a library in TypeScript projects.

## Basic Example

File: [`library-basic-usage.ts`](./library-basic-usage.ts)

Demonstrates the main features of the library mode:
- Creating a client with programmatic configuration
- Previewing posts
- Publishing posts
- Graceful shutdown (cleanup)

## Running the Example

1. **Build the library**:

   ```bash
   pnpm build:lib
   ```

2. **Run the example** (requires Node.js with ESM support):

   ```bash
   node examples/library-basic-usage.ts
   ```

## Quick Start

```typescript
import { createPostingClient } from 'social-media-posting-microservice';

const client = createPostingClient({
  accounts: {
    myBot: {
      platform: 'telegram',
      auth: {
        apiKey: 'YOUR_BOT_TOKEN'
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

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `accounts` | `Record<string, AccountConfig>` | **Required** | Account configurations |
| `requestTimeoutSecs` | `number` | `60` | Request timeout in seconds |
| `retryAttempts` | `number` | `3` | Number of retry attempts |
| `retryDelayMs` | `number` | `1000` | Delay between retries in ms |
| `idempotencyTtlMinutes` | `number` | `10` | TTL for idempotency cache |
| `logLevel` | `'debug' \| 'info' \| 'warn' \| 'error'` | `'warn'` | Logging level |
| `logger` | `ILogger` | `ConsoleLogger` | Custom logger implementation |

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

## API Reference & Examples

### `client.preview(request)`

Preview a post without publishing (validation).

```typescript
import { PostType } from 'social-media-posting-microservice';

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

Gracefully shuts down and releases resources.

```typescript
await client.destroy();
```

### Post Types (`PostType`)

Supported post types:

- `POST` - Text post
- `IMAGE` - Post with image
- `VIDEO` - Post with video
- `AUDIO` - Post with audio
- `DOCUMENT` - Post with document
- `ALBUM` - Post with multiple media
- `ARTICLE` - Article (for supported platforms)
- `AUTO` - Automatic type detection

### Body Formats (`BodyFormat`)

Supported text formats:

- `TEXT` - Plain text
- `HTML` - HTML markup
- `MARKDOWN` - Markdown

### Error Handling

```typescript
try {
  const result = await client.post(request);
  
  if (!result.success) {
    // Handle publication errors
    console.error('Error code:', result.error.code);
    console.error('Message:', result.error.message);
    console.error('Details:', result.error.details);
  }
} catch (error) {
  // Handle system errors (e.g., configuration error)
  console.error('System error:', error);
}
```

### Idempotency

Use `idempotencyKey` to prevent duplicate posts:

```typescript
const result = await client.post({
  platform: 'telegram',
  account: 'myBot',
  body: 'Important announcement',
  idempotencyKey: 'announcement-2026-01-07-v1', // Unique key
});

// Repeating the call with the same key will return the cached result
const cachedResult = await client.post({
  platform: 'telegram',
  account: 'myBot',
  body: 'Important announcement',
  idempotencyKey: 'announcement-2026-01-07-v1', // Same key
});
```

## Features

- **Isolation**: Uses only provided configuration, no env vars or global state.
- **Type Safety**: Full TypeScript support with exported types.
- **Error Handling**: Structured error responses.

## Additional Resources

- [Main README](../README.md)
