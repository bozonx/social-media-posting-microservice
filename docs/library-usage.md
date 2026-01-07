# Library Usage Guide

This guide describes how to use `social-media-posting-microservice` as a standalone TypeScript library.

## Introduction

In library mode, the service runs without a NestJS HTTP server (Fastify). It provides a programmatic API to validate and publish content to various social media platforms.

Key features of library mode:
- **Full Isolation**: Uses only provided configuration. No environment variables are read.
- **Standalone DI**: Initialized manually without the overhead of a full NestJS application.
- **Standard API**: The same business logic as used in microservice mode.
- **Custom Logging**: Inject your own logger implementation.

## Installation

```bash
pnpm add social-media-posting-microservice
# or
npm install social-media-posting-microservice
```

## Quick Start

```typescript
import { createPostingClient } from 'social-media-posting-microservice';

const client = createPostingClient({
  accounts: {
    marketing: {
      platform: 'telegram',
      auth: {
        botToken: 'YOUR_BOT_TOKEN'
      },
      channelId: '@my_channel'
    }
  }
});

const result = await client.post({
  account: 'marketing',
  platform: 'telegram',
  body: 'Hello from library mode!'
});

console.log(result);

await client.destroy();
```

## Configuration

The `createPostingClient` function accepts a `LibraryConfig` object.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `accounts` | `Record<string, AccountConfig>` | **Required** | Dictionary of named accounts. |
| `requestTimeoutSecs` | `number` | `60` | Total timeout for a single post/preview operation. |
| `retryAttempts` | `number` | `3` | Number of automatic retry attempts for transient errors. |
| `retryDelayMs` | `number` | `1000` | Base delay between retries. |
| `idempotencyTtlMinutes` | `number` | `10` | How long to keep idempotency records in memory. |
| `logLevel` | `'debug' \| 'info' \| 'warn' \| 'error'` | `'warn'` | Logging verbosity for the default console logger. |
| `logger` | `ILogger` | `ConsoleLogger` | Custom logger implementation. |

### Account Configuration

Each account must follow the `AccountConfig` interface:
- `platform`: `'telegram'` (more coming soon)
- `auth`: Platform-specific authentication (e.g., `{ botToken: string }` for Telegram)
- `channelId`: Target identifier (e.g., `@channel` or numeric ID)
- `maxBody`: (Optional) Limit for body length.

## API Reference

### `client.post(request, abortSignal?)`

Publishes content to the specified account.

**Parameters:**
- `request`: [PostRequestDto](../src/modules/post/dto/post-request.dto.ts)
- `abortSignal`: (Optional) Standard `AbortSignal` to cancel the request.

**Returns:** 
A promise that resolves to either success data or an error object. It **does not throw** for business/platform errors.

### `client.preview(request)`

Validates the request and performs content conversion (e.g., Markdown to HTML) without publishing.

**Parameters:**
- `request`: [PostRequestDto](../src/modules/post/dto/post-request.dto.ts)

**Returns:**
A promise resolving to a preview result including `detectedType`, `convertedBody`, and any `warnings`.

### `client.destroy()`

Gracefully shuts down the client, cleaning up any timers or internal resources. Always call this when finished or on application shutdown.

## Custom Logger

You can provide your own logger by implementing the `ILogger` interface:

```typescript
import { ILogger, createPostingClient } from 'social-media-posting-microservice';

class MyLogger implements ILogger {
  debug(msg: string, ctx?: string) { /* ... */ }
  log(msg: string, ctx?: string) { /* ... */ }
  warn(msg: string, ctx?: string) { /* ... */ }
  error(msg: string, trace?: string, ctx?: string) { /* ... */ }
}

const client = createPostingClient({
  accounts: { ... },
  logger: new MyLogger()
});
```

## Isolation and Environment

When used as a library, the package is strictly isolated:
1. **No `process.env`**: It will NOT attempt to read `BOT_TOKEN` or any other environment variables. All secrets must be passed explicitly in the `accounts` configuration.
2. **No Config Files**: It will NOT try to load `config.yaml`.
3. **Instance Isolation**: You can create multiple clients with different configurations in the same process; they will not interfere with each other.

## Best Practices

1. **Re-use Client**: Create one client instance and reuse it for multiple posts.
2. **Idempotency**: Always provide an `idempotencyKey` in your post requests to prevent duplicate posts during retries or network issues.
3. **Graceful Shutdown**: Ensure `client.destroy()` is called to avoid memory leaks or hanging processes.
4. **Error Handling**: Check the `success` field in the response.

```typescript
const result = await client.post(request);
if (result.success) {
  // Use result.data
} else {
  // Handle result.error
}
```
