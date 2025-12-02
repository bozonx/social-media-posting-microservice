# Usage Examples

This document provides detailed examples of using the Social Media Post node in n8n workflows.

## Table of Contents

- [Basic Examples](#basic-examples)
- [Advanced Examples](#advanced-examples)
- [Error Handling](#error-handling)
- [Workflow Patterns](#workflow-patterns)

## Basic Examples

### 1. Simple Text Post

**Scenario:** Post a simple text message to Telegram channel.

**Node Configuration:**
```
Operation: Publish Post
Platform: Telegram
Authentication Mode: Use Channel from Config
Channel Name: my_channel
Post Content: Hello from n8n! 👋
```

**Expected Output:**
```json
{
  "postId": "123",
  "url": "https://t.me/my_channel/123",
  "platform": "telegram",
  "type": "post",
  "publishedAt": "2024-12-02T10:00:00.000Z",
  "requestId": "uuid-v4"
}
```

---

### 2. Image Post with Caption

**Scenario:** Post an image with formatted caption.

**Node Configuration:**
```
Operation: Publish Post
Platform: Telegram
Channel Name: my_channel
Post Content: <b>New Product Launch!</b>\n\nCheck out our latest innovation.
Body Format: html
Cover Image: https://example.com/product.jpg
```

**Expected Output:**
```json
{
  "postId": "124",
  "url": "https://t.me/my_channel/124",
  "platform": "telegram",
  "type": "image",
  "publishedAt": "2024-12-02T10:05:00.000Z",
  "requestId": "uuid-v4"
}
```

---

### 3. Using Inline Authentication

**Scenario:** Post without pre-configured channel.

**Node Configuration:**
```
Operation: Publish Post
Platform: Telegram
Authentication Mode: Use Inline Auth
Bot Token: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
Chat ID: @my_channel
Post Content: Test message with inline auth
```

---

## Advanced Examples

### 4. Photo Album

**Scenario:** Post multiple images as an album.

**Node Configuration:**
```
Operation: Publish Post
Platform: Telegram
Channel Name: my_channel
Post Content: Our team at the conference 📸

Additional Options > Media Array:
[
  "https://example.com/photo1.jpg",
  "https://example.com/photo2.jpg",
  "https://example.com/photo3.jpg"
]
```

**Expected Output:**
```json
{
  "postId": "125",
  "url": "https://t.me/my_channel/125",
  "platform": "telegram",
  "type": "album",
  "publishedAt": "2024-12-02T10:10:00.000Z",
  "requestId": "uuid-v4"
}
```

---

### 5. Image with Spoiler

**Scenario:** Post sensitive content hidden under spoiler.

**Node Configuration:**
```
Operation: Publish Post
Platform: Telegram
Channel Name: my_channel
Post Content: ⚠️ Spoiler alert!

Additional Options > Cover Image:
{
  "url": "https://example.com/spoiler.jpg",
  "hasSpoiler": true
}
```

---

### 6. Post with Inline Keyboard

**Scenario:** Add clickable buttons to the post.

**Node Configuration:**
```
Operation: Publish Post
Platform: Telegram
Channel Name: my_channel
Post Content: Check out our website for more info!

Additional Options > Platform Options:
{
  "inlineKeyboard": [
    [
      {"text": "Visit Website", "url": "https://example.com"},
      {"text": "Contact Us", "url": "https://example.com/contact"}
    ],
    [
      {"text": "Documentation", "url": "https://docs.example.com"}
    ]
  ]
}
```

---

### 7. Reuse Uploaded File (file_id)

**Scenario:** Repost previously uploaded media without re-uploading.

**Node Configuration:**
```
Operation: Publish Post
Platform: Telegram
Channel Name: my_channel
Post Content: Reposting our popular video

Additional Options > Video:
{
  "fileId": "BAACAgIAAxkBAAIC4mF9xYZ..."
}
```

**Benefits:**
- Faster posting (no upload time)
- Saves bandwidth
- Telegram file_id is permanent for your bot

---

### 8. Silent Notification

**Scenario:** Post without notifying channel subscribers.

**Node Configuration:**
```
Operation: Publish Post
Platform: Telegram
Channel Name: my_channel
Post Content: Late night update (silent mode)

Additional Options > Platform Options:
{
  "disableNotification": true
}
```

---

### 9. Preview Before Publishing

**Scenario:** Validate content formatting before actual posting.

**Node Configuration:**
```
Operation: Preview Post
Platform: Telegram
Channel Name: my_channel
Post Content: # Hello\n\nThis is **bold** text
Body Format: md
```

**Expected Output:**
```json
{
  "valid": true,
  "detectedType": "post",
  "convertedBody": "<b>Hello</b>\n\nThis is <b>bold</b> text",
  "targetFormat": "html",
  "convertedBodyLength": 42,
  "warnings": []
}
```

---

### 10. Idempotency Key

**Scenario:** Prevent duplicate posts in case of retries.

**Node Configuration:**
```
Operation: Publish Post
Platform: Telegram
Channel Name: my_channel
Post Content: Important announcement
Idempotency Key: announcement-2024-12-02-001

Additional Options > Idempotency Key: announcement-2024-12-02-001
```

**Behavior:**
- First request: Post is published
- Duplicate request within TTL: Returns cached response
- Request after TTL: Treated as new post

---

## Error Handling

### 11. Continue on Fail

**Scenario:** Process multiple items, don't stop on errors.

**Workflow Setup:**
1. **Webhook** node receives array of posts
2. **Split In Batches** node processes one by one
3. **Social Media Post** node with **Continue On Fail** enabled
4. **IF** node checks for errors
5. **Error Logger** node saves failed items

**Node Configuration:**
```
Settings > Continue On Fail: Enabled

Operation: Publish Post
Platform: Telegram
Channel Name: my_channel
Post Content: {{$json.message}}
```

**Error Output:**
```json
{
  "error": "Message text is empty",
  "code": "VALIDATION_ERROR",
  "details": {},
  "requestId": "uuid-v4"
}
```

---

### 12. Retry Logic

**Scenario:** Handle rate limits gracefully.

**Note:** The microservice automatically retries transient errors (rate limits, timeouts, 5xx errors) based on `config.yaml` settings. No additional configuration needed in n8n.

**Microservice Config:**
```yaml
common:
  retryAttempts: 3
  retryDelayMs: 1000
```

---

## Workflow Patterns

### 13. RSS to Telegram

**Workflow:**
1. **Schedule Trigger** (every 15 minutes)
2. **RSS Feed Read** node
3. **Filter** new items only
4. **Social Media Post** node

**Post Node Configuration:**
```
Operation: Publish Post
Platform: Telegram
Channel Name: news_channel
Post Content: <b>{{$json.title}}</b>\n\n{{$json.description}}
Body Format: html
Cover Image: {{$json.image}}
```

---

### 14. Multi-Platform Publishing

**Workflow:**
1. **Manual Trigger** or **Webhook**
2. **Set** node (prepare content)
3. **Social Media Post** (Telegram)
4. **Social Media Post** (VK) - when available
5. **Social Media Post** (Instagram) - when available

**Pattern:** Use same content, different platform configurations.

---

### 15. Content Approval Workflow

**Workflow:**
1. **Webhook** receives content
2. **Social Media Post** (Preview mode)
3. **IF** node checks `valid === true`
4. **Send Email** for approval
5. **Wait** for webhook callback
6. **Social Media Post** (Publish mode)

**Preview Node:**
```
Operation: Preview Post
Platform: Telegram
Channel Name: my_channel
Post Content: {{$json.content}}
```

**Publish Node:**
```
Operation: Publish Post
Platform: Telegram
Channel Name: my_channel
Post Content: {{$json.content}}
Idempotency Key: {{$json.contentId}}
```

---

### 16. Scheduled Posts

**Workflow:**
1. **Google Sheets** or **Database** with scheduled posts
2. **Schedule Trigger** (every hour)
3. **Filter** posts for current hour
4. **Social Media Post** node

**Note:** `scheduledAt` parameter is currently ignored by Telegram provider. Use n8n's scheduling instead.

---

### 17. Dynamic Content from Database

**Workflow:**
1. **Schedule Trigger** (daily at 9 AM)
2. **PostgreSQL** node (fetch today's content)
3. **Function** node (format content)
4. **Social Media Post** node

**Function Node:**
```javascript
const item = $input.item.json;

return {
  json: {
    content: `<b>${item.title}</b>\n\n${item.body}`,
    image: item.image_url,
    tags: item.tags.split(',')
  }
};
```

**Post Node:**
```
Post Content: {{$json.content}}
Cover Image: {{$json.image}}
Tags: {{$json.tags.join(',')}}
```

---

### 18. Error Notification

**Workflow:**
1. **Social Media Post** node (Continue On Fail enabled)
2. **IF** node checks for errors
3. **Send Email** or **Slack** notification

**IF Node Condition:**
```
{{$json.error}} is not empty
```

**Notification Content:**
```
Error posting to social media:
Code: {{$json.code}}
Message: {{$json.error}}
Request ID: {{$json.requestId}}
```

---

## Tips and Best Practices

### Content Formatting

1. **Use Preview Mode First:** Always test content formatting with Preview operation before publishing
2. **Choose Correct Body Format:** Match your content (HTML tags → `html`, Markdown syntax → `md`)
3. **Enable Convert Body:** Let the microservice handle format conversion automatically

### Media Handling

1. **Use Public URLs:** Ensure media URLs are publicly accessible
2. **Reuse file_id:** For frequently posted media, save and reuse Telegram file_id
3. **Check File Sizes:** Telegram limit is 50 MB for URL uploads
4. **Album Size:** Use 2-10 items for albums

### Error Handling

1. **Enable Continue On Fail:** For batch operations to prevent workflow stops
2. **Log Errors:** Save failed items for later retry or manual review
3. **Monitor Request IDs:** Use for debugging and support requests

### Performance

1. **Batch Processing:** Use Split In Batches for large datasets
2. **Rate Limiting:** Respect platform limits (Telegram: ~30 messages/second)
3. **Idempotency Keys:** Prevent duplicates during retries

### Security

1. **Use Credentials:** Store bot tokens in n8n credentials, not in workflow
2. **Channel Mode:** Prefer channel-based auth over inline for production
3. **Environment Variables:** Use env vars in microservice `config.yaml`

---

## Troubleshooting Examples

### Invalid Media URL

**Error:**
```json
{
  "error": "Failed to download media from URL",
  "code": "PLATFORM_ERROR"
}
```

**Solution:** Verify URL is publicly accessible and returns correct content-type.

---

### Rate Limit Exceeded

**Error:**
```json
{
  "error": "Too Many Requests: retry after 30",
  "code": "RATE_LIMIT_ERROR"
}
```

**Solution:** Microservice automatically retries. Reduce posting frequency if persistent.

---

### Authentication Failed

**Error:**
```json
{
  "error": "Unauthorized",
  "code": "AUTH_ERROR"
}
```

**Solution:** 
- Verify bot token is correct
- Check bot has admin rights in channel
- Ensure chat ID format is correct (`@channel` or `-100123456789`)

---

For more examples and support, visit:
- [GitHub Repository](https://github.com/bozonx/social-media-posting-microservice)
- [API Documentation](https://github.com/bozonx/social-media-posting-microservice/blob/main/docs/api.md)
- [n8n Community Forum](https://community.n8n.io/)
