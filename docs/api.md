# API Documentation

## Base URL

```
http://localhost:8080/api/v1
```

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/post` | Publish content to a platform |
| POST | `/preview` | Validate and preview without publishing |
| GET | `/health` | Health check |

---

## POST /post

Publish content to a social media platform.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platform` | string | Yes | Platform name (`telegram`) |
| `body` | string | Yes | Post content |
| `channel` | string | No* | Channel name from `config.yaml` |
| `auth` | object | No* | Inline authentication credentials |
| `type` | string | No | Post type (default: `auto`) |
| `bodyFormat` | string | No | Body format: `text`, `html`, `md` (default: `text`) |
| `convertBodyDefault` | boolean | No | **Reserved.** Not used for Telegram (body is sent as-is) |
| `title` | string | No | Post title (platform-specific) |
| `description` | string | No | Post description (platform-specific) |
| `cover` | MediaInput | No | Cover image |
| `video` | MediaInput | No | Video file |
| `audio` | MediaInput | No | Audio file |
| `document` | MediaInput | No | Document file |
| `media` | MediaInput[] | No | Media array for albums (2-10 items) |
| `options` | object | No | Platform-specific options (passed directly to provider API) |
| `tags` | string[] | No | Tags/hashtags |
| `scheduledAt` | string | No | Scheduled time (ISO 8601) |
| `postLanguage` | string | No | Content language code |
| `mode` | string | No | Mode: `publish`, `draft` |
| `idempotencyKey` | string | No | Key to prevent duplicates |

**Note:** Either `channel` or `auth` must be provided.

### Post Types

| Type | Description |
|------|-------------|
| `auto` | Auto-detect from media fields (default) |
| `post` | Text-only message |
| `image` | Single image with caption |
| `video` | Video with caption |
| `audio` | Audio file with caption |
| `album` | Media group (2-10 items) |
| `document` | Document/file |
| `article` | Long-form article |
| `short` | Short-form video |
| `story` | Story/status |
| `poll` | Poll |

### MediaInput Format

Media fields accept a string URL or an object:

```json
// String URL
"cover": "https://example.com/image.jpg"

// Object with options
"cover": {
  "url": "https://example.com/image.jpg",
  "fileId": "AgACAgIAAxkBAAIC...",
  "hasSpoiler": true
}
```

| Property | Type | Description |
|----------|------|-------------|
| `url` | string | Media file URL |
| `fileId` | string | Telegram file_id (reuse uploaded files) |
| `hasSpoiler` | boolean | Hide under spoiler |

Either `url` or `fileId` must be provided. If both present, `fileId` takes priority.

### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "postId": "123456",
    "url": "https://t.me/channel/123456",
    "platform": "telegram",
    "type": "post",
    "publishedAt": "2025-11-30T20:00:00.000Z",
    "raw": {
      "ok": true,
      "result": {
        "message_id": 123456,
        "chat": { "id": -1001234567890 },
        "date": 1701369600,
        "text": "Post content"
      }
    },
    "requestId": "uuid-v4"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `postId` | string | Platform-specific post ID |
| `url` | string | Public URL to the post (if available) |
| `platform` | string | Platform name |
| `type` | string | Actual post type used |
| `publishedAt` | string | Publication timestamp (ISO 8601) |
| `raw` | object | Raw response from platform API in format `{ok: true, result: {...}}` (matches Telegram Bot API structure) |
| `requestId` | string | Unique request identifier for tracking |

### Error Response

**Status:** `200 OK`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Error description",
    "details": {},
    "raw": {},
    "requestId": "uuid-v4"
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request parameters |
| `AUTH_ERROR` | Authentication failed |
| `PLATFORM_ERROR` | Platform API error |
| `TIMEOUT_ERROR` | Request timeout |
| `RATE_LIMIT_ERROR` | Rate limit exceeded |
| `INTERNAL_ERROR` | Internal server error |

---

## POST /preview

Validate and preview content without publishing.

### Request Body

Same as `/post`. The `idempotencyKey` field is ignored.

### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "valid": true,
    "detectedType": "post",
    "convertedBody": "<b>Hello</b> world",
    "targetFormat": "html",
    "convertedBodyLength": 19,
    "warnings": []
  }
}
```

### Error Response

**Status:** `200 OK`

```json
{
  "success": false,
  "data": {
    "valid": false,
    "errors": ["Either 'channel' or 'auth' must be provided"],
    "warnings": []
  }
}
```

---

## GET /health

Returns service health status.

**Response:**

```json
{
  "status": "ok"
}
```

---

## Telegram

### Supported Types

| Type | API Method |
|------|------------|
| `post` | sendMessage |
| `image` | sendPhoto |
| `video` | sendVideo |
| `audio` | sendAudio |
| `document` | sendDocument |
| `album` | sendMediaGroup |

### Auto Type Detection

When `type` is `auto` (default), the type is detected by priority:

| Priority | Field | Detected Type |
|----------|-------|---------------|
| 1 | `media[]` | `album` |
| 2 | `document` | `document` |
| 3 | `audio` | `audio` |
| 4 | `video` | `video` |
| 5 | `cover` | `image` |
| 6 | (none) | `post` |

**Note:** With `type: auto`, only one media field should be provided. Multiple conflicting fields return a validation error.

### Body Format Handling

The `bodyFormat` field specifies the format of the `body` content. For Telegram, the body is **sent as-is** without any conversion. The `bodyFormat` value is mapped directly to Telegram's `parse_mode` parameter:

| `bodyFormat` | Telegram `parse_mode` | Description |
|--------------|----------------------|-------------|
| `text` | *(not set)* | Plain text, no formatting |
| `html` | `HTML` | HTML formatting |
| `md` | `Markdown` | Markdown formatting |

**Important Notes:**

- **No conversion is performed** - the body content you provide must already be in the format specified by `bodyFormat`
- **MarkdownV2 support** - To use Telegram's `MarkdownV2` format, set `bodyFormat: "md"` and add `parse_mode: "MarkdownV2"` in the `options` field (see example below)
- **Options override** - If you specify `parse_mode` in the `options` field, it will override the automatic mapping from `bodyFormat`

**Examples:**

```json
// Plain text (no formatting)
{
  "body": "Hello world",
  "bodyFormat": "text"
}

// HTML formatting
{
  "body": "<b>Hello</b> <i>world</i>",
  "bodyFormat": "html"
}

// Markdown formatting
{
  "body": "**Hello** _world_",
  "bodyFormat": "md"
}

// MarkdownV2 formatting (advanced)
{
  "body": "*Hello* _world_\\!",
  "bodyFormat": "md",
  "options": {
    "parse_mode": "MarkdownV2"
  }
}
```

### Platform Options

The `options` field accepts platform-specific parameters that are passed directly to the Telegram Bot API without transformation. Use the exact field names from the [Telegram Bot API documentation](https://core.telegram.org/bots/api).

Common options:

```typescript
{
  "parse_mode": "HTML" | "Markdown" | "MarkdownV2",
  "disable_notification": boolean,
  "disable_web_page_preview": boolean,  // deprecated, use link_preview_options
  "link_preview_options": {
    "is_disabled": boolean,
    "url": string,
    "prefer_small_media": boolean,
    "prefer_large_media": boolean,
    "show_above_text": boolean
  },
  "protect_content": boolean,
  "reply_to_message_id": number,
  "reply_markup": {
    "inline_keyboard": [[{
      "text": string,
      "url"?: string,
      "callback_data"?: string,
      "web_app"?: { "url": string },
      // ... other button types
    }]]
  }
}
```

**Note:** If `parse_mode` or `disable_notification` are specified in `options`, they will override the values derived from `bodyFormat` or channel configuration.


### Telegram Limits

| Type | Limit |
|------|-------|
| Text message | 4096 characters |
| Caption | 1024 characters |
| Album items | 2-10 files |
| File size (URL) | 50 MB |

### Ignored Fields

These fields are not used by Telegram and will be ignored:

- `title`, `description`, `tags`, `postLanguage`, `mode`, `scheduledAt`

---

## Examples

### Text Post

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "my_channel",
    "body": "<b>Hello!</b> Test post",
    "bodyFormat": "html"
  }'
```

### Image Post

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "my_channel",
    "body": "Image caption",
    "cover": "https://example.com/image.jpg"
  }'
```

### Album

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "my_channel",
    "body": "Photo gallery",
    "media": [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg"
    ]
  }'
```

### Audio

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "my_channel",
    "body": "New podcast",
    "audio": "https://example.com/podcast.mp3"
  }'
```

### Document

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "my_channel",
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
    "channel": "my_channel",
    "body": "Sensitive content",
    "cover": {
      "url": "https://example.com/image.jpg",
      "hasSpoiler": true
    }
  }'
```

### Using file_id

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "my_channel",
    "body": "Reposting video",
    "video": {
      "fileId": "BAACAgIAAxkBAAIC4mF9..."
    }
  }'
```

### With Inline Keyboard

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "my_channel",
    "body": "Check our website!",
    "options": {
      "reply_markup": {
        "inline_keyboard": [
          [{"text": "Visit", "url": "https://example.com"}],
          [{"text": "Contact", "callback_data": "contact"}]
        ]
      }
    }
  }'
```

### With Inline Auth

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "body": "Test post",
    "auth": {
      "botToken": "123456:ABC...",
      "chatId": "@my_channel"
    }
  }'
```

### Preview

```bash
curl -X POST http://localhost:8080/api/v1/preview \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "my_channel",
    "body": "# Hello\n\nThis is **bold**",
    "bodyFormat": "md"
  }'
```

---

## Idempotency

When `idempotencyKey` is provided:

1. Key is combined with payload and hashed
2. Stored in in-memory cache with TTL (`idempotencyTtlMinutes`)
3. Duplicate requests within TTL:
   - If processing → `409 Conflict`
   - If completed → cached response returned

**Limitations:**

- Scoped to single instance
- Lost on restart
- No cross-instance support (requires Redis)

---

## Content Conversion

The microservice supports content format conversion between:

- HTML → Markdown, Plain Text
- Markdown → HTML, Plain Text

**Note:** For Telegram, body content is **not converted** - it is sent as-is to the Telegram API. The `bodyFormat` field simply maps to the appropriate `parse_mode` parameter. Content conversion may be used by other platform providers in the future.

---

## Retry Logic

Automatic retries for transient errors:

- **Retryable:** Network timeouts, 5xx, rate limits
- **Non-retryable:** Validation errors, 4xx (except 429)
- **Formula:** `delay = retryDelayMs × random(0.8, 1.2) × attempt`

Configure in `config.yaml`:

```yaml
retryAttempts: 3
retryDelayMs: 1000
```

---

## Configuration

Channel configuration in `config.yaml`:

```yaml
channels:
  my_channel:
    provider: telegram

    auth:
      botToken: ${MY_TELEGRAM_TOKEN}
      chatId: "@my_channel"
```

Environment variables are substituted using `${VAR_NAME}` syntax.
