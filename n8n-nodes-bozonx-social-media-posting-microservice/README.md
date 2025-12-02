# n8n-nodes-bozonx-social-media-posting-microservice

An n8n community node for publishing content to social media platforms via the [Social Media Posting microservice](https://github.com/bozonx/social-media-posting-microservice).

## Features

- **Multiple Platforms**: Telegram (VK, Instagram support coming soon)
- **Multiple Post Types**: Text, image, video, audio, album, document, article, story, poll
- **Flexible Authentication**: Use pre-configured channels from `config.yaml` or provide inline credentials
- **MediaInput Support**: Upload by URL, reuse uploaded files with `fileId`, add spoiler effects
- **Content Conversion**: Auto-convert between HTML, Markdown, and plain text formats
- **Platform Options**: Customize with platform-specific options (inline keyboards, parse mode, notifications, etc.)
- **Idempotency**: Prevent duplicate posts with idempotency keys (in-memory cache with configurable TTL)
- **Error Handling**: Built-in retry logic for transient errors and continue-on-fail support
- **Preview Mode**: Validate and preview posts without publishing to test content formatting

## Installation

### Community Nodes (Recommended)

1. Go to **Settings** > **Community Nodes** in n8n
2. Click **Install**
3. Enter `n8n-nodes-bozonx-social-media-posting-microservice`
4. Install and restart n8n

### Manual Installation

```bash
npm install n8n-nodes-bozonx-social-media-posting-microservice
```

For Docker:

```dockerfile
RUN npm install -g n8n-nodes-bozonx-social-media-posting-microservice
```

## Quick Start

### 1. Start the Microservice

```bash
docker run -d \
  --name social-media-posting \
  -p 8080:8080 \
  -v /path/to/config.yaml:/app/config.yaml \
  bozonx/social-media-posting-microservice:latest
```

Test the service:

```bash
curl http://localhost:8080/api/v1/health
# Expected: {"status":"ok"}
```

### 2. Configure n8n Credentials

1. In n8n, create a new **Bozonx Microservices API** credential
2. Set **Gateway URL**: `http://localhost:8080` (without `/api/v1` suffix)
3. Set **API Token** (optional, only if your microservice requires authentication)

### 3. Use the Node

Add the **Social Media Post** node to your workflow and configure:

#### Using Pre-configured Channel:

- **Operation**: `Publish Post`
- **Platform**: `Telegram`
- **Authentication Mode**: `Use Channel from Config`
- **Channel Name**: `my_channel`
- **Post Content**: `Hello, world!`

#### Using Inline Authentication:

- **Operation**: `Publish Post`
- **Platform**: `Telegram`
- **Authentication Mode**: `Use Inline Auth`
- **Bot Token**: `123456:ABC...`
- **Chat ID**: `@mychannel`
- **Post Content**: `Hello, world!`

## Configuration

### Required Parameters

| Parameter | Description | Values |
|-----------|-------------|--------|
| **Operation** | Action to perform | `Publish Post`, `Preview Post` |
| **Platform** | Social media platform | `telegram` |
| **Post Content** | Main content/body of the post | Any text (max 100,000 characters) |
| **Authentication Mode** | How to authenticate | `Use Channel from Config`, `Use Inline Auth` |

**Note:** Either channel name (from microservice `config.yaml`) or inline credentials must be provided.

### Additional Options

| Parameter | Description | Default |
|-----------|-------------|---------|
| **Post Type** | Type of post (auto, post, image, video, audio, album, document, article, short, story, poll) | `auto` |
| **Body Format** | Format of post content (html, md, text) | `html` |
| **Convert Body** | Convert body to platform-specific format | `true` |
| **Title** | Post title (platform-specific) | - |
| **Description** | Post description (platform-specific) | - |
| **Cover Image** | Cover image URL or MediaInput object | - |
| **Video** | Video URL or MediaInput object | - |
| **Audio** | Audio URL or MediaInput object | - |
| **Document** | Document URL or MediaInput object | - |
| **Media Array** | JSON array of media for albums (2-10 items) | - |
| **Platform Options** | Platform-specific options as JSON object | - |
| **Tags** | Comma-separated tags/hashtags | - |
| **Post Language** | Content language code (e.g., en, ru) | - |
| **Mode** | Publishing mode (publish, draft) | `publish` |
| **Scheduled At** | Scheduled time (ISO 8601 format) | - |
| **Idempotency Key** | Key to prevent duplicate posts | - |

### MediaInput Format

Media fields (`Cover Image`, `Video`, `Audio`, `Document`) accept either:

**Simple URL string:**
```
https://example.com/image.jpg
```

**JSON object with options:**
```json
{
  "url": "https://example.com/image.jpg",
  "fileId": "AgACAgIAAxkBAAIC...",
  "hasSpoiler": true
}
```

**Properties:**
- `url` (string): Direct URL to media file
- `fileId` (string): Telegram file_id to reuse previously uploaded files
- `hasSpoiler` (boolean): Hide media under spoiler (Telegram only)

**Note:** Either `url` or `fileId` must be provided. If both are present, `fileId` takes priority.

### Platform Options (Telegram)

Provide as JSON object in the **Platform Options** field:

```json
{
  "parseMode": "HTML",
  "disableNotification": true,
  "disableWebPagePreview": false,
  "protectContent": false,
  "replyToMessageId": 123456,
  "inlineKeyboard": [[{"text": "Visit", "url": "https://example.com"}]]
}
```

**Available options:**
- `parseMode`: Text formatting mode (`HTML`, `Markdown`, `MarkdownV2`)
- `disableNotification`: Send silently without notification
- `disableWebPagePreview`: Disable link previews
- `protectContent`: Restrict forwarding and saving
- `replyToMessageId`: Reply to specific message
- `inlineKeyboard`: Add inline buttons (array of button rows)

## Usage Examples

### Text Post

```
Operation: Publish Post
Platform: Telegram
Authentication Mode: Use Channel from Config
Channel Name: my_channel
Post Content: <b>Hello!</b> Test post
Body Format: html
```

### Image Post

```
Operation: Publish Post
Platform: Telegram
Channel Name: my_channel
Post Content: Check out this image!
Cover Image: https://example.com/image.jpg
```

### Album

```
Operation: Publish Post
Platform: Telegram
Channel Name: my_channel
Post Content: Photo gallery
Media Array: ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"]
```

### Image with Spoiler

```
Operation: Publish Post
Platform: Telegram
Channel Name: my_channel
Post Content: Sensitive content
Cover Image: {"url": "https://example.com/image.jpg", "hasSpoiler": true}
```

### Using file_id

```
Operation: Publish Post
Platform: Telegram
Channel Name: my_channel
Post Content: Reposting video
Video: {"fileId": "BAACAgIAAxkBAAIC4mF9..."}
```

### With Inline Keyboard

```
Operation: Publish Post
Platform: Telegram
Channel Name: my_channel
Post Content: Check our website!
Platform Options: {"inlineKeyboard": [[{"text": "Visit", "url": "https://example.com"}]]}
```

### Preview Mode

```
Operation: Preview Post
Platform: Telegram
Channel Name: my_channel
Post Content: # Hello\n\nThis is **bold**
Body Format: md
```

Output:
```json
{
  "valid": true,
  "detectedType": "post",
  "convertedBody": "<b>Hello</b>\n\nThis is <b>bold</b>",
  "targetFormat": "html",
  "convertedBodyLength": 41,
  "warnings": []
}
```

## Error Handling

Enable **Continue On Fail** in node settings to handle errors gracefully without stopping workflow execution.

### Error Response Format

**Publish operation:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {},
  "requestId": "uuid-v4"
}
```

**Preview operation:**
```json
{
  "valid": false,
  "errors": ["Error message 1", "Error message 2"],
  "warnings": [],
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | Description | Retry |
|------|-------------|-------|
| `VALIDATION_ERROR` | Invalid request parameters | No |
| `AUTH_ERROR` | Authentication failed | No |
| `PLATFORM_ERROR` | Platform API error | Depends |
| `TIMEOUT_ERROR` | Request timeout | Yes |
| `RATE_LIMIT_ERROR` | Rate limit exceeded | Yes |
| `INTERNAL_ERROR` | Internal server error | Yes |

**Note:** The microservice automatically retries transient errors (timeouts, 5xx, rate limits) based on `config.yaml` settings.

## Troubleshooting

### Node Not Found After Installation
1. Restart n8n completely
2. Check **Settings** → **Community Nodes** for installation status
3. Verify package name: `n8n-nodes-bozonx-social-media-posting-microservice`

### Connection Error
1. Verify microservice is running:
   ```bash
   curl http://localhost:8080/api/v1/health
   # Expected: {"status":"ok"}
   ```
2. Ensure **Gateway URL** does NOT include `/api/v1` suffix
3. Check port 8080 is accessible from n8n container/instance
4. Verify network connectivity (Docker networks, firewalls)

### Authentication Error

**Using Channel Mode:**
- Verify channel name exists in microservice `config.yaml`
- Check channel is enabled: `enabled: true`
- Ensure environment variables are properly substituted

**Using Inline Auth:**
- Verify bot token format: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
- Verify chat ID format: `@channelname` or `-100123456789`
- Check bot has admin permissions in the channel
- Ensure bot is added to the channel

### Publishing Error
1. Review error message and code in node output
2. Check platform-specific limits:
   - Telegram text: 4096 characters
   - Telegram caption: 1024 characters
   - Telegram album: 2-10 items
   - Telegram file size: 50 MB (via URL)
3. Verify media URLs are publicly accessible
4. Ensure media formats are supported (JPEG, PNG, MP4, etc.)
5. Check body format matches content (HTML tags in HTML mode, etc.)

### Preview Validation Fails
- Review `errors` array in response
- Check all required fields are provided
- Verify media URLs are valid (format, not necessarily accessible)
- Ensure `type: auto` doesn't have conflicting media fields

## Development

### Build

```bash
pnpm build
```

### Watch Mode

```bash
pnpm build:watch
```

### Lint

```bash
pnpm lint
pnpm lint:fix
```

### Publish

```bash
pnpm publish:npm
```

## Microservice Configuration

The microservice uses `config.yaml` for channel configuration. Example:

```yaml
channels:
  my_channel:
    provider: telegram
    enabled: true
    auth:
      botToken: ${TELEGRAM_BOT_TOKEN}
      chatId: "@my_channel"
    parseMode: HTML
    convertBody: true
    bodyFormat: html
```

Environment variables are substituted using `${VAR_NAME}` syntax.

## Resources

- [Social Media Posting Microservice Repository](https://github.com/bozonx/social-media-posting-microservice)
- [Microservice API Documentation](https://github.com/bozonx/social-media-posting-microservice/blob/main/docs/api.md)
- [Microservice Development Guide](https://github.com/bozonx/social-media-posting-microservice/blob/main/docs/dev.md)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)
- [n8n Community Forum](https://community.n8n.io/)
- [Telegram Bot API](https://core.telegram.org/bots/api)

## License

MIT
