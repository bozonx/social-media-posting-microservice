# n8n-nodes-bozonx-social-media-posting-microservice

N8N node for posting content to social media via the [Social Media Posting Microservice](https://github.com/bozonx/social-media-posting-microservice).

## Installation

### Community Nodes (Recommended)

1. **Settings** → **Community Nodes** → **Install**
2. Enter: `n8n-nodes-bozonx-social-media-posting-microservice`
3. Restart n8n

### Manual

```bash
npm install n8n-nodes-bozonx-social-media-posting-microservice
```

Docker:
```dockerfile
RUN npm install -g n8n-nodes-bozonx-social-media-posting-microservice
```

## Quick Start

### 1. Run the Microservice

```bash
docker run -d \
  --name social-media-posting \
  -p 8080:8080 \
  -v /path/to/config.yaml:/app/config.yaml \
  bozonx/social-media-posting-microservice:latest
```

Verify:
```bash
curl http://localhost:8080/api/v1/health
# Expected: {"status":"ok"}
```

### 2. Create Credentials in n8n

1. Create **Social Media Posting API** credential
2. Configure:
   - **Microservice Base URL**: `http://localhost:8080/api/v1` (full path with `/api/v1`)
   - **Microservice Authentication**: None / Basic Auth / Bearer Token (for microservice access)
   - **Telegram Bot Token**: Your bot token (only needed for Inline Mode)

### 3. Use the Node

There are two authentication modes:

#### Channel Mode (Recommended)

Use pre-configured channels from microservice `config.yaml`. Platform and auth are stored on the server.

- **Channel**: `my_channel` (channel name from config)
- **Platform**: Select platform (informational, not sent to server)
- **Post Content**: Your message

The node sends only `channel` and content. Server uses auth from `config.yaml`.

#### Inline Mode

Use credentials from n8n. Leave **Channel** empty.

- **Channel**: *(empty)*
- **Platform**: `Telegram`
- **Post Content**: Your message
- **Channel ID**: `@mychannel` or `-100123456789`

The node sends `platform`, `auth.apiKey` (from Telegram Bot Token), and content.

> **Note**: If both Channel and Telegram Bot Token are specified, Channel takes priority (auth from credentials is ignored).

## Media Input Format

Media fields (`Cover Image`, `Video`, `Audio`, `Document`, `Media Array`) accept:

**URL string:**
```
https://example.com/image.jpg
```

**Telegram file_id string:**
```
AgACAgIAAxkBAAIC...
```

**JSON object:**
```json
{
  "src": "https://example.com/image.jpg",
  "hasSpoiler": true
}
```

**Properties:**
- `src`: Media URL or Telegram file_id (max 500 characters)
- `hasSpoiler`: Spoiler flag (Telegram only)

**Notes:**
- String values are automatically detected as URL or file_id based on format
- You can use the **Cover has Spoiler** and **Video has Spoiler** switches in *Additional Options* to enable the spoiler effect for simple string inputs
- `src` has a maximum length of 500 characters

**Media Array** (for albums, 2-10 items):
```json
["https://example.com/1.jpg", "https://example.com/2.jpg"]
```

or with objects:
```json
[
  {"src": "https://example.com/1.jpg"},
  {"src": "AgACAgIAAxkBAAIC..."}
]
```

## Platform Options (Telegram)

JSON object for advanced Telegram features:
```json
{
  "parse_mode": "HTML",
  "disable_notification": true,
  "disable_web_page_preview": false,
  "protect_content": false,
  "reply_to_message_id": 123456,
  "reply_markup": {
    "inline_keyboard": [[{"text": "Open", "url": "https://example.com"}]]
  }
}
```

**Available options:**
- `parse_mode`: `HTML`, `Markdown`, `MarkdownV2`
- `disable_notification`: Send without sound
- `disable_web_page_preview`: Disable link previews
- `protect_content`: Prevent forwarding
- `reply_to_message_id`: Reply to message ID
- `reply_markup`: Inline keyboard and other reply markup (see [Telegram Bot API](https://core.telegram.org/bots/api#sendmessage))

## Idempotency

Use **Idempotency Key** to prevent duplicate posts. Repeated requests with the same key will return the result of the first publication without creating a duplicate.

## Error Handling

Enable **Continue On Fail** to continue workflow execution on errors.

### Error Response Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {},
  "requestId": "uuid-v4"
}
```

### Error Codes

| Code | Description | Retry |
|------|-------------|-------|
| `VALIDATION_ERROR` | Invalid parameters | No |
| `AUTH_ERROR` | Authentication error | No |
| `PLATFORM_ERROR` | Platform API error | Depends |
| `TIMEOUT_ERROR` | Timeout | Yes |
| `RATE_LIMIT_ERROR` | Rate limit exceeded | Yes |
| `INTERNAL_ERROR` | Internal error | Yes |

The microservice automatically retries requests on temporary errors.

## Troubleshooting

### Node Not Found After Installation
1. Fully restart n8n
2. Check **Settings** → **Community Nodes**
3. Verify package name is correct

### Connection Error
1. Verify microservice is accessible:
   ```bash
   curl http://localhost:8080/api/v1/health
   ```
2. **Base URL** must include `/api/v1`
3. Check port 8080 is accessible
4. Check network (Docker networks, firewall)

### Authentication Error

**Channel Mode:**
- Verify channel exists in microservice `config.yaml`
- Check environment variable substitution

**Inline Auth:**
- Bot token format: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
- Chat ID format: `@channelname` or `-100123456789`
- Bot must be channel admin
- Bot must be added to the channel

### Publishing Error
1. Check error message
2. Telegram limits:
   - Text: 4096 characters
   - Caption: 1024 characters
   - Album: 2-10 items
   - File size: 50 MB (via URL)
3. Media URLs must be publicly accessible
4. Check supported formats (JPEG, PNG, MP4)
5. Text format must match content

## Microservice Configuration

Example `config.yaml`:

```yaml
channels:
  my_channel:
    platform: telegram
    auth:
      apiKey: ${TELEGRAM_BOT_TOKEN}
      chatId: "@my_channel"
    bodyFormat: html
```

Environment variables are substituted via `${VAR_NAME}`.

## Resources

- [Microservice Repository](https://github.com/bozonx/social-media-posting-microservice)
- [API Documentation](https://github.com/bozonx/social-media-posting-microservice/blob/main/docs/api.md)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)
- [Telegram Bot API](https://core.telegram.org/bots/api)

## License

MIT
