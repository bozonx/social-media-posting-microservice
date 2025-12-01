# API Documentation

## Base URL

```
http://localhost:8080/api/v1
```

## Authentication

Currently, authentication is handled via channel configuration in `config.yaml` or by passing credentials in the request body.

---

## Endpoints

### POST /post

Publish content to a social media platform.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platform` | string | Yes | Platform name (e.g., "telegram") |
| `body` | string | Yes | Main content of the post |
| `type` | string | No | Post type: `post`, `article`, `image`, `album`, `video`, `short`, `audio`, `document`, `story`, `poll` |
| `bodyFormat` | string | No | Format of body content: `html`, `md`, `text` (default: `text`) |
| `convertBody` | boolean | No | Auto-convert body to platform-required format (default: `true`) |
| `title` | string | No | Post title (for platforms that require it) |
| `description` | string | No | Post description (for platforms like YouTube, Instagram) |
| `cover` | string | No | URL of cover image |
| `video` | string | No | URL of video file |
| `media` | string[] | No | Array of media URLs for albums/carousels |
| `channel` | string | No* | Channel name from config.yaml |
| `auth` | object | No* | Authentication credentials (if not using channel) |
| `platformData` | object | No | Platform-specific parameters |
| `tags` | string[] | No | Tags/hashtags |
| `scheduledAt` | string | No | Scheduled publish time (ISO 8601) |
| `language` | string | No | Content language code |
| `mode` | string | No | Publishing mode: `publish`, `draft`, `preview` (default: `publish`) |
| `idempotencyKey` | string | No | Unique key to prevent duplicate posts |

**Note:** Either `channel` or `auth` must be provided.

#### Success Response

**Code:** `200 OK`

```json
{
  "success": true,
  "data": {
    "postId": "123456",
    "url": "https://t.me/channel/123456",
    "platform": "telegram",
    "type": "post",
    "publishedAt": "2025-11-30T20:00:00.000Z",
    "raw": { /* platform response */ },
    "requestId": "uuid-v4"
  }
}
```

#### Error Response

**Code:** `200 OK` (with `success: false`)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Error description",
    "details": { /* additional info */ },
    "raw": { /* platform error response */ },
    "requestId": "uuid-v4"
  }
}
```

#### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `PROVIDER_NOT_FOUND` | 400 | Platform not supported |
| `CHANNEL_NOT_FOUND` | 404 | Channel not found in config |
| `AUTH_ERROR` | 401 | Authentication failed |
| `PLATFORM_ERROR` | 502 | Error from platform API |
| `MEDIA_DOWNLOAD_ERROR` | 500 | Failed to download media |
| `CONVERSION_ERROR` | 500 | Content conversion failed |
| `TIMEOUT_ERROR` | 504 | Request timeout |
| `RATE_LIMIT_ERROR` | 429 | Rate limit exceeded |

---

## Platform-Specific Parameters

### Telegram

#### Supported Types
- `post` - Text post
- `image` - Photo with caption
- `video` - Video with caption
- `album` - Media group (up to 10 items)
- `document` - File/document

#### Platform Data (`platformData`)

```typescript
{
  "parseMode": "HTML" | "Markdown" | "MarkdownV2",
  "disableNotification": boolean,
  "inlineKeyboard": InlineKeyboardButton[][],
  "disableWebPagePreview": boolean,
  "replyToMessageId": number,
  "protectContent": boolean
}
```

#### Example: Text Post

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "company_telegram",
    "type": "post",
    "body": "<b>Hello!</b> This is a test post with <a href=\"https://example.com\">link</a>",
    "bodyFormat": "html",
    "platformData": {
      "parseMode": "HTML",
      "disableNotification": false
    }
  }'
```

#### Example: Image Post

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "company_telegram",
    "type": "image",
    "body": "Image description",
    "cover": "https://example.com/image.jpg"
  }'
```

#### Example: Album (Carousel)

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "company_telegram",
    "type": "album",
    "body": "Album description",
    "media": [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg",
      "https://example.com/photo3.jpg"
    ]
  }'
```

#### Example: With Inline Keyboard

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "company_telegram",
    "type": "post",
    "body": "Check out our website!",
    "platformData": {
      "inlineKeyboard": [
        [
          {
            "text": "Visit Website",
            "url": "https://example.com"
          }
        ],
        [
          {
            "text": "Contact Us",
            "url": "https://example.com/contact"
          }
        ]
      ]
    }
  }'
```

#### Example: With Inline Auth

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "type": "post",
    "body": "Test post",
    "auth": {
      "botToken": "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz",
      "chatId": "@my_channel"
    }
  }'
```

---

## Content Conversion

The service automatically converts content between formats:

### Supported Conversions

- HTML → Markdown
- HTML → Plain Text
- Markdown → HTML
- Markdown → Plain Text

### Conversion Rules

1. If `convertBody = false`, content is sent as-is
2. If `convertBody = true` (default):
   - Determines target format based on platform requirements
   - Converts from `bodyFormat` to target format
   - Applies platform-specific limitations (text length, etc.)
   - Sanitizes HTML if required

### Example: Markdown to HTML

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "channel": "company_telegram",
    "body": "# Hello\n\nThis is **bold** and this is *italic*",
    "bodyFormat": "md",
    "convertBody": true,
    "platformData": {
      "parseMode": "HTML"
    }
  }'
```

---

## Retry Logic

The service automatically retries failed requests for temporary errors:

- **Retryable errors:** Network timeouts, 5xx errors, rate limits
- **Non-retryable errors:** Validation errors, 4xx errors (except 429)
- **Retry count:** Configurable in `config.yaml` (default: 3)
- **Delay:** Configurable with **±20% jitter** (hardcoded)
- **Formula:** `delay = retryDelayMs * random(0.8, 1.2) * attemptNumber`

---

## Configuration

Channels are configured in `config.yaml`:

```yaml
channels:
  company_telegram:
    provider: telegram
    enabled: true
    auth:
      botToken: ${TELEGRAM_BOT_TOKEN}
      chatId: ${TELEGRAM_CHAT_ID}
    parseMode: HTML
    disableNotification: false
    convertBody: true
    bodyFormat: html
    maxTextLength: 4096
    maxCaptionLength: 1024
```

Environment variables are substituted using `${VAR_NAME}` syntax.

---

## Rate Limiting

Rate limiting is handled at the API Gateway level, not by this microservice.

---

## Future Endpoints (Not Yet Implemented)

### POST /preview

Validate and preview content without publishing.

**Request:** Same as `/post`

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "convertedBody": "processed content",
    "targetFormat": "html",
    "estimatedLength": 150,
    "warnings": []
  }
}
```

---

## Health Check

### GET /health

Returns service health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-30T20:00:00.000Z"
}
```

---

## Best Practices

1. **Use named channels** from config instead of inline auth for better security
2. **Set idempotencyKey** for critical posts to prevent duplicates
3. **Validate media URLs** before sending (microservice does basic validation only)
4. **Handle both success and error responses** properly
5. **Use appropriate bodyFormat** for your content type
6. **Monitor requestId** in responses for debugging

---

## Support

For issues or questions, please refer to:
- [PRD Documentation](../dev_docs/PRD.md)
- [Configuration Example](../config.yaml)
- [GitHub Issues](https://github.com/your-repo/issues)
