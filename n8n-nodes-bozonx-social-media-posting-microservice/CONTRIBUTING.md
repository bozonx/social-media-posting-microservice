# Contributing Guide

Thank you for your interest in contributing to the Social Media Post n8n node!

## Development Setup

### Prerequisites

- Node.js 18+ and pnpm
- n8n installed (for testing)
- Social Media Posting microservice running

### Installation

```bash
cd n8n-nodes-bozonx-social-media-posting-microservice
pnpm install
```

### Development Workflow

1. **Make Changes:** Edit files in `nodes/` or `credentials/`
2. **Build:** `pnpm build`
3. **Test Locally:** Link to n8n for testing
4. **Lint:** `pnpm lint` or `pnpm lint:fix`

### Local Testing

#### Option 1: Link to Global n8n

```bash
# In this directory
pnpm build
pnpm link --global

# In n8n directory
pnpm link --global n8n-nodes-bozonx-social-media-posting-microservice

# Restart n8n
n8n start
```

#### Option 2: Use n8n Dev Mode

```bash
pnpm dev
```

This starts n8n in development mode with the node automatically loaded.

### Project Structure

```
n8n-nodes-bozonx-social-media-posting-microservice/
├── nodes/
│   └── Post/
│       ├── BozonxPost.node.ts    # Main node implementation
│       └── post.svg               # Node icon
├── credentials/
│   └── BozonxMicroservicesApi.credentials.ts  # Credentials definition
├── dist/                          # Compiled output (gitignored)
├── package.json                   # Package configuration
├── tsconfig.json                  # TypeScript configuration
├── README.md                      # User documentation
├── CHANGELOG.md                   # Version history
├── EXAMPLES.md                    # Usage examples
└── CONTRIBUTING.md                # This file
```

## Making Changes

### Node Implementation

The main node logic is in `nodes/Post/BozonxPost.node.ts`:

- **Properties:** Define UI fields and options
- **Execute:** Handle the actual API calls

### Adding New Features

1. **Add UI Field:** Update `properties` array in node description
2. **Handle Parameter:** Update `execute()` method to process new parameter
3. **Update Docs:** Add examples to README.md and EXAMPLES.md
4. **Update Changelog:** Document changes in CHANGELOG.md

### Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Add JSDoc comments for complex logic
- Use meaningful variable names

### Testing Checklist

Before submitting changes:

- [ ] Code builds without errors: `pnpm build`
- [ ] Linting passes: `pnpm lint`
- [ ] Tested with actual microservice
- [ ] Tested both publish and preview operations
- [ ] Tested error handling (continue-on-fail)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated

## Publishing

### Version Bumping

Follow [Semantic Versioning](https://semver.org/):

- **Patch** (1.3.x): Bug fixes, documentation
- **Minor** (1.x.0): New features, backward compatible
- **Major** (x.0.0): Breaking changes

Update version in `package.json`:

```json
{
  "version": "1.3.0"
}
```

### Build and Publish

```bash
# Build the package
pnpm build

# Publish to npm
pnpm publish:npm
```

This will:
1. Build TypeScript to JavaScript
2. Publish to npm registry
3. Make available for n8n community nodes

### Pre-publish Checklist

- [ ] Version bumped in `package.json`
- [ ] CHANGELOG.md updated with new version
- [ ] README.md reflects current features
- [ ] All tests passing
- [ ] No uncommitted changes
- [ ] Git tag created: `git tag v1.3.0`

## Pull Request Process

1. **Fork** the repository
2. **Create Branch:** `git checkout -b feature/my-feature`
3. **Make Changes:** Follow guidelines above
4. **Commit:** Use clear commit messages
5. **Push:** `git push origin feature/my-feature`
6. **Create PR:** Against `main` branch

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Breaking change

## Testing
How was this tested?

## Checklist
- [ ] Code builds successfully
- [ ] Linting passes
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
```

## Reporting Issues

### Bug Reports

Include:
- n8n version
- Node version
- Microservice version
- Steps to reproduce
- Expected vs actual behavior
- Error messages/logs

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternative solutions considered
- Impact on existing functionality

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## Questions?

- Open an issue on GitHub
- Check existing documentation
- Ask in n8n community forum

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
