# Development Guide

Quick reference for developing the n8n node for Social Media Posting microservice.

## Quick Start

```bash
cd n8n-nodes-bozonx-social-media-posting-microservice
pnpm install
pnpm build
```

## Project Structure

```
.
├── nodes/Post/
│   ├── BozonxPost.node.ts    # Main node implementation
│   └── post.svg               # Node icon
├── credentials/
│   └── BozonxMicroservicesApi.credentials.ts
├── dist/                      # Build output
├── package.json
├── tsconfig.json
├── README.md                  # User documentation
├── CHANGELOG.md               # Version history
├── EXAMPLES.md                # Usage examples
└── CONTRIBUTING.md            # Contribution guide
```

## Development Commands

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Build and watch for changes
pnpm build:watch

# Lint
pnpm lint

# Auto-fix linting issues
pnpm lint:fix

# Publish to npm
pnpm publish:npm
```

## Testing Locally

### Option 1: Link to n8n

```bash
# In this directory
pnpm build
pnpm link --global

# In your n8n installation
pnpm link --global n8n-nodes-bozonx-social-media-posting-microservice

# Restart n8n
```

### Option 2: Dev Mode

```bash
pnpm dev
```

This starts n8n with the node automatically loaded.

## Making Changes

### 1. Update Node Logic

Edit `nodes/Post/BozonxPost.node.ts`:

- **Add UI field:** Update `properties` array
- **Handle parameter:** Update `execute()` method
- **Update types:** Import from `n8n-workflow`

### 2. Update Documentation

- `README.md` - User-facing documentation
- `EXAMPLES.md` - Usage examples
- `CHANGELOG.md` - Version history
- `CONTRIBUTING.md` - Development guide

### 3. Test Changes

```bash
pnpm build
pnpm lint
```

Test with actual microservice running on `http://localhost:8080`.

### 4. Version Bump

Update `package.json`:

```json
{
  "version": "1.3.0"
}
```

Follow [Semantic Versioning](https://semver.org/):
- **Patch** (1.3.x): Bug fixes
- **Minor** (1.x.0): New features
- **Major** (x.0.0): Breaking changes

### 5. Update Changelog

Add entry to `CHANGELOG.md`:

```markdown
## [1.3.0] - 2024-12-02

### Added
- New feature description

### Changed
- Changed feature description

### Fixed
- Bug fix description
```

## Publishing

### Manual Publish

```bash
pnpm build
pnpm publish:npm
```

### Automated Publish (GitHub Actions)

Push a git tag:

```bash
git tag v1.3.0
git push origin v1.3.0
```

GitHub Actions will automatically build and publish to npm.

## Code Style

- TypeScript strict mode
- Use `IDataObject` for JSON objects
- Add JSDoc for complex logic
- Follow existing patterns
- No `any` types (use proper types)

## Common Issues

### Build Fails

```bash
# Clean and rebuild
rm -rf dist node_modules
pnpm install
pnpm build
```

### Lint Errors

```bash
# Auto-fix
pnpm lint:fix

# Check specific file
pnpm lint nodes/Post/BozonxPost.node.ts
```

### Node Not Appearing in n8n

1. Restart n8n completely
2. Clear n8n cache
3. Check `package.json` → `n8n.nodes` path
4. Verify build output in `dist/`

## API Reference

### Node Properties

```typescript
{
  displayName: string;      // UI label
  name: string;             // Internal name
  type: string;             // Field type
  default: any;             // Default value
  required?: boolean;       // Is required
  description?: string;     // Help text
  displayOptions?: object;  // Conditional display
}
```

### Execute Function

```typescript
async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const returnData: INodeExecutionData[] = [];
  
  // Process items...
  
  return [returnData];
}
```

## Resources

- [n8n Node Development](https://docs.n8n.io/integrations/creating-nodes/)
- [n8n Workflow Types](https://github.com/n8n-io/n8n/blob/master/packages/workflow/src/Interfaces.ts)
- [Microservice API](../docs/api.md)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Support

- GitHub Issues: [Report bugs](https://github.com/bozonx/social-media-posting-microservice/issues)
- n8n Forum: [Ask questions](https://community.n8n.io/)
