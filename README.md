# Social Media Posting Microservice

A stateless microservice for publishing content to social media platforms through a unified REST API.

## Features

- **Unified API** — Single endpoint for all platforms
- **Telegram Support** — Posts, images, videos, albums, documents, audio
- **Auto Type Detection** — Automatically determines post type from media fields
- **Idempotency** — Prevents duplicate posts with `idempotencyKey`
- **Retry Logic** — Automatic retries with jitter for transient errors
- **YAML Config** — Environment variable substitution support

## Quick Start

### 1. Install

```bash
pnpm install
```

### 2. Configure

```bash
cp .env.production.example .env.production
```

Edit `config.yaml` with your Telegram credentials:

```yaml
accounts:
  my_account:
    platform: telegram

    auth:
      apiKey: ${MY_TELEGRAM_TOKEN}  # or direct value
    channelId: "@my_channel"

```

### 3. Run

```bash
pnpm start:dev        # Development
pnpm build && pnpm start:prod  # Production
```

API available at `http://localhost:8080/api/v1`

## Usage Examples

### Text Post

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "account": "my_channel",
    "body": "<b>Hello!</b> This is a test post",
    "bodyFormat": "html"
  }'
```

### Image Post
    
```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "account": "my_channel",
    "body": "Check out this image!",
    "cover": {
      "src": "https://example.com/image.jpg"
    }
  }'
```

### Album

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "account": "my_channel",
    "body": "Photo gallery",
    "media": [
      { "src": "https://example.com/photo1.jpg" },
      { "src": "https://example.com/photo2.jpg" }
    ]
  }'
```

### Image with Spoiler

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "account": "my_channel",
    "body": "Sensitive content",
    "cover": {
      "src": "https://example.com/image.jpg",
      "hasSpoiler": true
    }
  }'
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/post` | Publish content |
| POST | `/api/v1/preview` | Validate and preview without publishing |
| GET | `/api/v1/health` | Health check |

See [API Documentation](docs/api.md) for complete reference.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `LISTEN_HOST` | `0.0.0.0` | Server bind address |
| `LISTEN_PORT` | `8080` | Server port |
| `BASE_PATH` | (none) | Base path for the application (API will be at `{BASE_PATH}/api/v1`) |
| `LOG_LEVEL` | `warn` | Logging level |
| `CONFIG_PATH` | `./config.yaml` | Path to config file |

### Config File (`config.yaml`)

```yaml
# Request timeout (seconds)
# Total time limit for processing a request, including all retries and platform delays
requestTimeoutSecs: 60
retryAttempts: 3
retryDelayMs: 1000
idempotencyTtlMinutes: 10
accounts:
  my_account:
    platform: telegram
    auth:
      apiKey: ${MY_TELEGRAM_TOKEN}
    channelId: "@my_channel"
    maxBody: 100000  # Optional: account-specific limit; request maxBody can override it (up to hard limit 500000)
```

#### Limits

- **Request timeout**
  - Config field: `requestTimeoutSecs`
  - Range: **1–600 seconds** (up to 10 minutes)
  - Applied to the whole processing of a request, including retries and platform API calls.

- **Body length**
  - Hard service limit: **500,000 characters** (cannot be exceeded).
  - Effective limit is calculated as:
    - Request `maxBody` (if provided) →
    - otherwise account `maxBody` from `config.yaml` (if provided) →
    - otherwise the hard service limit `500000`.
  - If the body is longer than the effective limit, validation fails with a `VALIDATION_ERROR`.

## Graceful Shutdown

The service implements graceful shutdown to ensure in-flight requests complete properly when receiving termination signals.

### Behavior

When the service receives `SIGTERM` or `SIGINT`:

1. **New connections are rejected** — Returns `503 Service Unavailable` for new requests
2. **In-flight requests continue** — Active requests are allowed to complete
3. **Timeout enforcement** — Maximum wait time is **30 seconds** (hardcoded constant)
4. **Forced termination** — After timeout, the process exits even if requests are still active

### Configuration

- **Shutdown timeout**: `30 seconds` (global constant in `src/app.constants.ts`)
- **Fastify settings**:
  - `forceCloseConnections: 'idle'` — Closes idle connections during shutdown
  - `connectionTimeout: 60s` — Maximum time for establishing connections
  - `requestTimeout: 10m` — Maximum time for processing requests

### Docker

When running in Docker, ensure `stop_grace_period` in `docker-compose.yml` is **greater than or equal to** the shutdown timeout:

```yaml
services:
  microservice:
    stop_grace_period: 30s  # Must be >= GRACEFUL_SHUTDOWN_TIMEOUT_MS
```

If `stop_grace_period` is less than the shutdown timeout, Docker will forcefully kill the container before graceful shutdown completes.

## Docker

```bash
pnpm build
docker build -t social-posting:latest -f docker/Dockerfile .
docker compose -f docker/docker-compose.yml up -d
```

## Library Mode

The project can be used as a standalone TypeScript library in other applications.

### Installation

```bash
npm install social-media-posting-microservice
# or
pnpm add social-media-posting-microservice
```

### Usage

```typescript
import { createPostingClient } from 'social-media-posting-microservice';

// Initialize the client
const client = createPostingClient({
  accounts: {
    marketing: {
      platform: 'telegram',
      auth: {
        botToken: process.env.BOT_TOKEN,
        chatId: '@my_channel'
      }
    }
  },
  logLevel: 'error' // 'debug' | 'info' | 'warn' | 'error'
});

// Post content
try {
  const result = await client.post({
    account: 'marketing',
    platform: 'telegram',
    body: 'Hello from library mode!',
    bodyFormat: 'text'
  });
  console.log('Published:', result);
} catch (error) {
  console.error('Failed:', error);
} finally {
  // Cleanup resources
  await client.destroy();
}
```

## Development

```bash
pnpm start:dev    # Watch mode
pnpm build        # Build
pnpm lint         # Lint
pnpm format       # Format
pnpm test:unit    # Unit tests
pnpm test:e2e     # E2E tests
```

## License

MIT
