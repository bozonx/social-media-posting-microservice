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
cp env.production.example .env.production
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
    "cover": "https://example.com/image.jpg"
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
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg"
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
| `API_BASE_PATH` | `api` | API base path |
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
    maxBody: 100000  # Optional: account-specific limit (can be overridden in request)
```

## Docker

```bash
pnpm build
docker build -t social-posting:latest -f docker/Dockerfile .
docker compose -f docker/docker-compose.yml up -d
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
