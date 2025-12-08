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
| `body` | string | Yes | Post content (max length determined by `maxBody` or config default) |
| `account` | string | No* | Channel name from `config.yaml` |
| `channelId` | string | No | Channel/chat ID (e.g., @mychannel or -100123456789 for Telegram). Can override channel config |
| `auth` | object | No* | Inline authentication credentials. See [Auth Field](#auth-field) below |
| `type` | string | No | Post type (default: `auto`). See below |
| `bodyFormat` | string | No | Body format: `text`, `html`, `md`, or platform-specific (e.g., `MarkdownV2`) (default: `text`, max 50 characters) |
| `title` | string | No | Post title (platform-specific, max 1000 characters) |
| `description` | string | No | Post description (platform-specific, max 5000 characters) |
| `cover` | MediaInput | No | Cover image (object with `src` and optional `hasSpoiler`, max 500 characters for src) |
| `video` | MediaInput | No | Video file (object with `src` and optional `hasSpoiler`, max 500 characters for src) |
| `audio` | MediaInput | No | Audio file (object with `src`, max 500 characters) |
| `document` | MediaInput | No | Document file (object with `src`, max 500 characters) |
| `media` | MediaInput[] | No | Media array for albums (each object with `src` and optional `type`, `hasSpoiler`) |
| `options` | object | No | Platform-specific options (passed directly to platform API) |
| `disableNotification` | boolean | No | Send message silently (defaults to config value) |
| `tags` | string[] | No | Tags without # symbol. Passed as-is to supported platforms (max 200 items, each max 300 characters) |
| `scheduledAt` | string | No | Scheduled time (ISO 8601, max 50 characters) |
| `postLanguage` | string | No | Content language code. Passed as-is to supported platforms (max 50 characters) |
| `mode` | string | No | Mode: `publish`, `draft`. Only for supported platforms |
| `idempotencyKey` | string | No | Key to prevent duplicates (max 1000 characters) |
| `maxBody` | number | No | Override max body length from account config (max 500,000 characters). Takes priority over account's `maxBody` setting |

**Note:** Either `account` or `auth` must be provided.

### Auth Field

The `auth` field contains platform-specific authentication credentials. Its structure matches the `auth` section in `config.yaml`:

**For Telegram:**

```json
{
  "auth": {
    "apiKey": "123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
  }
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `apiKey` | string | Yes | API key (for Telegram: bot token from @BotFather) |

In addition to the fields listed in the table, the `auth` object may contain **additional provider-specific fields**.

- All `auth` fields from config and request are **merged and passed to the provider as-is**
- Each provider is responsible for parsing and validating its own extra fields

**Example with additional Telegram auth fields:**

```json
{
  "auth": {
    "apiKey": "123456789:ABC-DEF...",
    "customProxyUrl": "socks5://user:pass@host:1080"
  },
  "channelId": "@my_channel"
}
```

**Auth Merging Behavior:**

- If `account` is provided, the base auth is taken from the account configuration in `config.yaml`
- If `auth` is also provided in the request, its fields **override** the channel's auth fields
- All auth fields in the request are optional - they only override specific fields from the channel config
- Final validation checks that all required fields for the platform are present after merging

**Examples:**

```json
// Use channel config entirely
{
  "platform": "telegram",
  "account": "my_channel",
  "body": "Hello"
}

// Override only channelId
{
  "platform": "telegram",
  "account": "my_channel",
  "channelId": "@different_channel",
  "body": "Hello"
}

// Provide complete inline auth (no channel)
{
  "platform": "telegram",
  "auth": {
    "apiKey": "123456789:ABC-DEF..."
  },
  "channelId": "@my_channel",
  "body": "Hello"
}
```

### Post Types

| Type | Description |
|------|-------------|
| `auto` | Auto-detect from media fields (default) |
| `post` | Text message |
| `image` | Single image with caption |
| `video` | Video with caption |
| `audio` | Audio file with caption |
| `album` | Media group |
| `document` | Document/file |
| `article` | Long-form article |
| `short` | Short-form video |
| `story` | Story/status |
| `poll` | Poll |

### MediaInput Format

Media fields accept only object format with `src` property and additional options:

```json
// Object with URL src
"cover": {
  "src": "https://example.com/image.jpg"
}

// Object with file_id src (Telegram)
"cover": {
  "src": "AgACAgIAAxkBAAIC..."
}

// Object with URL src and hasSpoiler
"cover": {
  "src": "https://example.com/image.jpg",
  "hasSpoiler": true
}

// Object with file_id src and hasSpoiler
"cover": {
  "src": "AgACAgIAAxkBAAIC...",
  "hasSpoiler": true
}

// Media array item with explicit type
"media": [
  {
    "src": "https://example.com/image.jpg",
    "type": "image"
  },
  {
    "src": "https://example.com/video.mp4",
    "type": "video"
  }
]
```

**Object properties:**

| Property | Type | Description |
|----------|------|-------------|
| `src` | string | Media source (URL or Telegram file_id, max 500 characters) - **required** |
| `hasSpoiler` | boolean | Hide under spoiler (optional) |
| `type` | string | Explicit media type: `image`, `video`, `audio`, `document` (optional, used in `media[]` arrays) |

**Notes:**
- `src` is **required** in all media fields
- `src` can be either a URL or a Telegram file_id
- URL and file_id strings have a maximum length of 500 characters
- The `type` property is only used in `media[]` arrays to override auto-detection by URL extension
- For single media fields (`cover`, `video`, `audio`, `document`) the `type` property is ignored
- For Telegram albums, `type` is mapped to supported types: `video` → `video`, others → `photo`

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
    "valid": true,
    "detectedType": "post",
    "convertedBody": "# Hello\n\nThis is **bold**",
    "targetFormat": "md",
    "convertedBodyLength": 22,
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
    "errors": ["Either 'account' or 'auth' must be provided"],
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

**Note:** With `type: auto`, if multiple media fields are provided, the one with the highest priority is selected.
For Telegram, `cover` (priority 5) is considered low priority and cannot be combined with other media types (it will be ignored if higher priority media is present).
Other providers may allow combining `cover` with other media (e.g. video + cover).

### Body Format Handling

The `bodyFormat` field specifies the format of the `body` content. For Telegram, the body is **sent as-is** without any conversion. The `bodyFormat` value is used to determine the appropriate `parse_mode` parameter for Telegram's API.

**Standard format mappings:**

| `bodyFormat` | Telegram `parse_mode` | Description |
|--------------|----------------------|-------------|
| `text` | *(not set)* | Plain text, no formatting |
| `html` | `HTML` | HTML formatting |
| `md` | `Markdown` | Markdown formatting |

**Custom format support:**

Any other `bodyFormat` value is passed directly as-is to the `parse_mode` parameter. This allows you to use platform-specific formats like Telegram's `MarkdownV2`:

| `bodyFormat` | Telegram `parse_mode` | Description |
|--------------|----------------------|-------------|
| `MarkdownV2` | `MarkdownV2` | Telegram's MarkdownV2 format (passed as-is) |
| *any other* | *passed as-is* | Custom value for the platform |

**Important Notes:**

- **No conversion is performed** - the body content you provide must already be in the format specified by `bodyFormat`
- **Options override** - If you specify `parse_mode` in the `options` field, it will **always override** the automatic mapping from `bodyFormat`

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

// MarkdownV2 formatting - now can be specified directly in bodyFormat
{
  "body": "*Hello* _world_\\!",
  "bodyFormat": "MarkdownV2"
}

// Override bodyFormat with options.parse_mode
{
  "body": "*Hello* _world_\\!",
  "bodyFormat": "html",
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

**Note:** If `parse_mode` or `disable_notification` are specified in `options`, they will override the values derived from `bodyFormat` or account configuration.


### Telegram Limits

Telegram API enforces the following limits:

| Type | Limit |
|------|-------|
| Text message | 4096 characters |
| Caption | 1024 characters |
| Album items | Telegram limit: 2-10 files |
| File size (URL) | 50 MB |

**Note:** The microservice validates body length based on `maxBody` parameter. Priority order: request `maxBody` > account `maxBody`, with a hard service limit of 500,000 characters. Telegram's specific limits (4096 for text, 1024 for captions) are enforced by Telegram API itself.

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
    "account": "my_channel",
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
    "account": "my_channel",
    "body": "Image caption",
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

### Audio

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "account": "my_channel",
    "body": "New podcast",
    "audio": {
      "src": "https://example.com/podcast.mp3"
    }
  }'
```

### Document

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "account": "my_channel",
    "body": "Monthly report",
    "document": {
      "src": "https://example.com/report.pdf"
    }
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

### Using file_id

```bash
# Using file_id in object format
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "account": "my_channel",
    "body": "Reposting video",
    "video": {
      "src": "BAACAgIAAxkBAAIC4mF9..."
    }
  }'
```

### With Inline Keyboard

```bash
curl -X POST http://localhost:8080/api/v1/post \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "account": "my_channel",
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
      "apiKey": "123456:ABC..."
    },
    "channelId": "@my_channel"
  }'
```

### Preview

```bash
curl -X POST http://localhost:8080/api/v1/preview \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "account": "my_channel",
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

---

## Body Content Handling

**The microservice does not perform content conversion.** The `body` content is always sent as-is to the platform API.

The `bodyFormat` field is used only to specify the format of the content you're providing, which is then mapped to the appropriate platform-specific parameter (e.g., `parse_mode` for Telegram).

**Your responsibility:** Ensure that the `body` content is already formatted according to the `bodyFormat` you specify.

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
