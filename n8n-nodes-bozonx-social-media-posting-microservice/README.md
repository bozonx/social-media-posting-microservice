# n8n-nodes-bozonx-social-media-posting-microservice

An n8n community node for publishing content to social media platforms via the [Social Media Posting microservice](https://github.com/bozonx/social-media-posting-microservice).

## Features

- **Multiple Platforms**: Telegram (VK, Instagram coming soon)
- **Multiple Post Types**: Text, image, video, audio, album, document, article, story, poll
- **Flexible Authentication**: Use pre-configured channels or inline credentials
- **MediaInput Support**: Upload by URL, reuse uploaded files with `fileId`, add spoiler effects
- **Content Conversion**: Auto-convert between HTML, Markdown, and plain text
- **Platform Options**: Customize with platform-specific options (inline keyboards, parse mode, etc.)
- **Idempotency**: Prevent duplicate posts with idempotency keys
- **Error Handling**: Built-in retry logic and continue-on-fail support
- **Preview Mode**: Validate and preview posts without publishing

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

1. Create a new **Bozonx Microservices API** credential
2. Set **Gateway URL**: `http://localhost:8080`
3. Set **API Token** (optional, if authentication is required)

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

- **Operation**: `Publish Post` or `Preview Post`
- **Platform**: Social media platform (`telegram`)
- **Post Content**: Main content of the post
- **Authentication**: Either channel name or inline credentials

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

Media fields accept either a string URL or a JSON object:

```javascript
// String URL
"https://example.com/image.jpg"

// JSON object with options
{
  "url": "https://example.com/image.jpg",
  "fileId": "AgACAgIAAxkBAAIC...",
  "hasSpoiler": true
}
```

### Platform Options (Telegram)

```javascript
{
  "parseMode": "HTML",
  "disableNotification": true,
  "disableWebPagePreview": false,
  "protectContent": false,
  "replyToMessageId": 123456,
  "inlineKeyboard": [[{"text": "Visit", "url": "https://example.com"}]]
}
```

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

Enable **Continue On Fail** to handle errors gracefully. Errors are returned as:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request parameters |
| `AUTH_ERROR` | Authentication failed |
| `PLATFORM_ERROR` | Platform API error |
| `TIMEOUT_ERROR` | Request timeout |
| `RATE_LIMIT_ERROR` | Rate limit exceeded |
| `INTERNAL_ERROR` | Internal server error |

## Troubleshooting

### Node Not Found
- Restart n8n after installation
- Check **Settings** → **Community Nodes** for installation status

### Connection Error
- Verify microservice is running: `curl http://localhost:8080/api/v1/health`
- Ensure Gateway URL does NOT include `/api/v1`
- Check port 8080 is accessible

### Authentication Error
- Verify channel exists in `config.yaml` (when using channel mode)
- Verify bot token and chat ID are correct (when using inline auth)
- Check bot has permissions to post in the channel

### Publishing Error
- Review error message and code
- Check platform-specific limits (e.g., Telegram message length)
- Verify media URLs are accessible
- Ensure media formats are supported by the platform

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

## Resources

- [Social Media Posting Microservice](https://github.com/bozonx/social-media-posting-microservice)
- [API Documentation](https://github.com/bozonx/social-media-posting-microservice/blob/main/docs/api.md)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)
- [n8n Community Forum](https://community.n8n.io/)

## License

MIT
