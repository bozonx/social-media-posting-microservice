# Social Media Posting Microservice

A microservice for publishing content to various social media platforms through a unified REST API.

## Overview

This microservice provides a simple, unified interface for posting content to multiple social media platforms. It handles content format conversion, media validation, and platform-specific requirements automatically.

**Architecture Principles:**

- **Proxy Mode:** Synchronous request-response processing
- **Stateless:** No database, only configuration file
- **Scalable:** Run multiple instances with identical config
- **No Async Processing:** Direct API calls to platforms (no queues or workers)

## Current Status

✅ **MVP Implemented** with Telegram support

### Implemented Features:

- ✅ Telegram publishing (posts, images, videos, albums, documents, audio)
- ✅ Automatic post type detection (`type: auto`)
- ✅ Extended media support (URL, file_id, spoiler)
- ✅ Best-effort idempotency with `idempotencyKey` (per-instance, in-memory cache)
- ✅ Content conversion (HTML ↔ Markdown ↔ Text)
- ✅ Media URL validation
- ✅ Retry logic with ±20% jitter
- ✅ YAML configuration with environment variable substitution
- ✅ Platform-specific parameters support
- ✅ Comprehensive unit tests (195+ tests)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy example env file and set your credentials:

```bash
cp env.production.example .env.production
```

Edit `.env.production`:



### 3. Configure Channels

The `config.yaml` file is already set up with example configuration. Update it with your channel details:

```yaml
channels:
  company_telegram:
    provider: telegram
    enabled: true
    auth:
      # You can use direct values:
      # botToken: your_bot_token_here
      # chatId: @your_channel_username
      
      # OR use environment variables defined in .env:
      botToken: ${MY_TELEGRAM_TOKEN}
      chatId: ${MY_CHANNEL_ID}
    parseMode: HTML
    # ... other settings
```

### 4. Run

```bash
# Development
pnpm start:dev

# Production
pnpm build
pnpm start:prod
```

The API will be available at: `http://localhost:8080/api/v1`

## Usage Examples

### Publish a Text Post

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "company_telegram",
    "body": "<b>Hello World!</b> This is a test post",
    "bodyFormat": "html"
  }'
```

### Publish an Image (Auto-detected)

```bash
# Type is automatically detected as "image" when cover is provided
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "company_telegram",
    "body": "Check out this image!",
    "cover": "https://example.com/image.jpg"
  }'
```

### Publish an Album (Carousel)

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "company_telegram",
    "body": "Photo gallery",
    "media": [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg"
    ]
  }'
```

### Publish Audio

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "company_telegram",
    "body": "New podcast episode!",
    "audio": "https://example.com/podcast.mp3"
  }'
```

### Publish Document

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "company_telegram",
    "body": "Monthly report",
    "document": "https://example.com/report.pdf"
  }'
```

### Image with Spoiler

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "company_telegram",
    "body": "⚠️ Sensitive content",
    "cover": {
      "url": "https://example.com/image.jpg",
      "hasSpoiler": true
    }
  }'
```

## API Documentation

For complete API documentation, see [docs/api.md](docs/api.md)

**Available endpoints:**
- `POST /api/v1/post` - Publish content
- `GET /api/v1/health` - Health check

## Supported Platforms

### Currently Supported

- ✅ **Telegram** - Posts, images, videos, albums, documents, audio
  - Automatic type detection
  - Spoiler support for sensitive content
  - Telegram file_id reuse

### Coming Soon

- ⏳ **VK** - Posts, photos, videos
- ⏳ **Twitter/X** - Tweets, media
- ⏳ **YouTube** - Video uploads
- ⏳ **Instagram** - Posts, stories, reels
- ⏳ **TikTok** - Short videos
- ⏳ **Facebook** - Posts, videos

## Configuration

### Environment Variables

See `env.production.example` for all available options:

```bash
NODE_ENV=production
LISTEN_HOST=0.0.0.0
LISTEN_PORT=8080
API_BASE_PATH=api
LOG_LEVEL=warn
CONFIG_PATH=./config.yaml

# Custom variables for config.yaml
MY_TOKEN=...
```

### Config File

The `config.yaml` file controls:
- Platform-specific settings
- Channel configurations
- Retry logic parameters
- Content conversion options

See `config.yaml` for detailed configuration structure.

## Development

### Project Structure

```
src/
├── app.module.ts               # Main application module
├── main.ts                     # Application entry point
├── common/
│   └── enums/                  # Shared enumerations
├── modules/
│   ├── app-config/             # Configuration loader
│   ├── post/                   # Post controller & service
│   ├── providers/              # Platform implementations
│   │   ├── base/               # Base provider interface
│   │   └── telegram/           # Telegram provider
│   ├── converter/              # Content format conversion
│   └── media/                  # Media URL validation
└── config/                     # App configuration
```

### Adding a New Provider

1. Create provider directory: `src/modules/providers/yourplatform/`
2. Implement `IProvider` interface
3. Add provider to `providers.module.ts`
4. Update `PostService.getProvider()`
5. Add configuration to `config.yaml`

### Building

```bash
# Build
pnpm build

# Lint
pnpm lint

# Format
pnpm format
```

## Docker

### Build

```bash
pnpm build
docker build -t social-posting:latest -f docker/Dockerfile .
```

### Run with Docker Compose

```bash
docker compose -f docker/docker-compose.yml up -d
```

## Roadmap

### Phase 1: MVP ✅
- ✅ Basic project structure

### Phase 2: Extended Functionality
- [x] Unit tests (195+ tests)
- [x] Automatic type detection (`type: auto`)
- [x] Extended media support (audio, document, file_id, spoiler)
- [x] Best-effort idempotency with `idempotencyKey` (per-instance, in-memory cache)
- [ ] E2E tests
- [ ] `/preview` endpoint
- [ ] Enhanced error handling

## Architecture

### Principles

- **Stateless:** No state between requests
- **Proxy Mode:** Synchronous request-response
- **Modular:** Easy to add new providers
- **Configurable:** YAML config + environment variables

### Modules

- `app-config` - Configuration loader with env substitution
- `post` - Publishing controller and service
- `providers` - Platform implementations
- `converter` - Content format conversion
- `media` - Media URL validation

### Retry Logic

Failed requests are automatically retried for temporary errors:

- **Retryable:** Network timeouts, 5xx errors, rate limits
- **Non-retryable:** Validation errors, 4xx errors
- **Attempts:** Configurable (default: 3)
- **Delay:** Configurable with **±20% jitter**
- **Formula:** `delay = retryDelayMs * random(0.8, 1.2) * attempt`

## Security

- **Secrets:** Stored in `config.yaml` or environment variables (referenced via `${VAR}`)
- **Config:** Non-sensitive parameters in `config.yaml`
- **Logging:** Sensitive data is redacted
- **Rate Limiting:** Handled at API Gateway level
- **Validation:** All inputs validated via class-validator

## Documentation

- [API Documentation](docs/api.md) - Complete API reference
- [Config Example](config.yaml) - Configuration structure

## License

MIT

## Support

For issues or questions:
- Check the [API Documentation](docs/api.md)
- Open an issue on GitHub
