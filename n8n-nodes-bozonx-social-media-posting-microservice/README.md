# n8n-nodes-bozonx-translate-gateway-microservice

An n8n community node for text translation via the [Translate Gateway microservice](https://github.com/bozonx/translate-gateway-microservice).

## Features

- **Multiple Providers**: Google Translate, DeepL, DeepSeek LLM, OpenRouter LLM, Yandex Translate, AnyLang, LibreTranslate
- **Auto Language Detection**: Automatically detect source language
- **HTML Support**: Preserves HTML tags during translation
- **Text Chunking**: Automatically splits large texts with configurable strategies
- **Error Handling**: Built-in retry logic and continue-on-fail support

## Installation

### Community Nodes (Recommended)

1. Go to **Settings** > **Community Nodes** in n8n
2. Click **Install**
3. Enter `n8n-nodes-bozonx-translate-gateway-microservice`
4. Install and restart n8n

### Manual Installation

```bash
npm install n8n-nodes-bozonx-translate-gateway-microservice
```

For Docker:

```dockerfile
RUN npm install -g n8n-nodes-bozonx-translate-gateway-microservice
```

## Quick Start

### 1. Start the Microservice

```bash
docker run -d \
  --name translate-gateway \
  -p 8080:8080 \
  -e GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcp-service-account.json \
  -v /path/to/gcp-credentials.json:/secrets/gcp-service-account.json \
  bozonx/translate-gateway-microservice:latest
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

Add the **Translate Gateway** node to your workflow and configure:

- **Text**: `Hello, world!`
- **Target Language**: `ru`

Result:

```json
{
  "translatedText": "Привет, мир!",
  "provider": "google"
}
```

## Configuration

### Required Parameters

- **Text**: Source text to translate (plain text or HTML)
- **Target Language**: ISO 639-1 language code (e.g., `en`, `ru`, `es`, `fr`, `de`)

### Optional Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| **Source Language** | ISO 639-1 source language code | Auto-detect |
| **Provider** | Translation provider | Service default |
| **Model** | Model name (for LLM providers) | Provider default |
| **Max Chunk Length** | Maximum characters per chunk | Provider default |
| **Splitter** | Text splitting strategy | `sentence` |

### Providers

| Provider | Type | Environment Variable |
|----------|------|---------------------|
| Google | Translation API | `GOOGLE_APPLICATION_CREDENTIALS` |
| DeepL | Translation API | `DEEPL_AUTH_KEY` |
| DeepSeek | LLM | `DEEPSEEK_API_KEY` |
| OpenRouter | LLM | `OPENROUTER_API_KEY` |
| Yandex | Translation API | `YANDEX_API_KEY`, `YANDEX_FOLDER_ID` |
| AnyLang | Open Source | None (uses [translate-tools/core](https://github.com/translate-tools/core)) |
| LibreTranslate | Open Source | `LIBRETRANSLATE_URL` |

Configure providers via microservice environment variables. See [microservice documentation](https://github.com/bozonx/translate-gateway-microservice) for details.

### Text Splitting Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `sentence` | Split by sentences | General text (default) |
| `paragraph` | Split by paragraphs | Long-form content |
| `markdown` | Split by markdown sections | Markdown documents |
| `off` | No splitting (error if exceeds limit) | HTML or structured content |

**Note**: HTML content is automatically detected and never chunked. If HTML exceeds provider limits, an error is returned.

## Usage Examples

### Basic Translation

```
Text: "Привет, мир!"
Target Language: en
```

Output:

```json
{
  "translatedText": "Hello, world!",
  "provider": "google"
}
```

### HTML Translation

```
Text: "<p>Bonjour, <b>monde</b>!</p>"
Target Language: en
Provider: deepl
```

Output:

```json
{
  "translatedText": "<p>Hello, <b>world</b>!</p>",
  "provider": "deepl"
}
```

### LLM Translation

```
Text: "Hello, world!"
Target Language: ru
Provider: deepseek
Model: deepseek-chat
```

Output:

```json
{
  "translatedText": "Привет, мир!",
  "provider": "deepseek",
  "model": "deepseek-chat"
}
```

### Large Text with Chunking

```
Text: "Very long text... (5000+ characters)"
Target Language: es
Max Chunk Length: 1000
Splitter: paragraph
```

The text is automatically split into chunks, translated separately, and reassembled.

## Error Handling

Enable **Continue On Fail** to handle errors gracefully. Errors are returned as:

```json
{
  "error": "Error message"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `400` | Invalid request (missing required fields) |
| `404` | Unknown provider |
| `413` | Text exceeds maximum length |
| `422` | Provider error (quota exceeded, unsupported language) |
| `503` | Provider unavailable or timeout |

## Troubleshooting

### Node Not Found
- Restart n8n after installation
- Check **Settings** → **Community Nodes** for installation status

### Connection Error
- Verify microservice is running: `curl http://localhost:8080/api/v1/health`
- Ensure Gateway URL does NOT include `/api/v1`
- Check port 8080 is accessible

### Translation Error (422)
- Provider API key not configured in microservice
- Unsupported language code
- Provider quota exceeded

### Timeout Error (503)
- Provider is slow or unavailable
- Increase `REQUEST_TIMEOUT_SEC` in microservice environment variables

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

- [Translate Gateway Microservice](https://github.com/bozonx/translate-gateway-microservice)
- [API Documentation](https://github.com/bozonx/translate-gateway-microservice/blob/main/docs/api.md)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)
- [n8n Community Forum](https://community.n8n.io/)

## License

MIT
