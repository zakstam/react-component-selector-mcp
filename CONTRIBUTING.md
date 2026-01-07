# Contributing to React Component Selector MCP

Thank you for your interest in contributing! This guide will help you set up the development environment and understand our workflow.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18 or higher ([download](https://nodejs.org/))
- **pnpm** 9 or higher ([install](https://pnpm.io/installation))

To verify your setup:

```bash
node --version   # Should be v18.0.0 or higher
pnpm --version   # Should be 9.0.0 or higher
```

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/zakstam/react-component-selector-mcp.git
cd react-component-selector-mcp
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Build All Packages

```bash
pnpm build
```

### 4. Start Development Mode

```bash
pnpm dev
```

This starts all packages in watch mode, automatically rebuilding on changes.

## Project Structure

```
react-component-selector-mcp/
├── packages/
│   ├── shared/          # Shared types and schemas (internal, not published)
│   ├── react/           # React component and hooks
│   └── cli/             # CLI and MCP server
├── examples/
│   └── test-app/        # Next.js test application
├── .changeset/          # Changeset configuration
├── package.json         # Root package.json
└── pnpm-workspace.yaml  # pnpm workspace config
```

### Package Details

| Package | npm Name | Description |
|---------|----------|-------------|
| `packages/shared` | (internal) | Shared TypeScript types, Zod schemas, message formats |
| `packages/react` | `@react-component-selector-mcp/react` | React component for browser integration |
| `packages/cli` | `@react-component-selector-mcp/cli` | CLI tool and MCP server |

## Development Workflow

### Running the Test App

The `examples/test-app` directory contains a Next.js app for testing:

```bash
cd examples/test-app
pnpm dev
```

### Available Scripts

Run from the repository root:

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages |
| `pnpm dev` | Start all packages in watch mode |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm clean` | Remove all build outputs |

### Testing Changes

1. Make your changes in `packages/`
2. Run `pnpm dev` to rebuild automatically
3. Test in `examples/test-app` or your own React app

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

Edit the relevant files in `packages/`.

### 3. Create a Changeset

We use [Changesets](https://github.com/changesets/changesets) for version management. After making changes:

```bash
pnpm changeset
```

This will prompt you to:
1. Select which packages changed (`cli`, `react`, or both)
2. Choose the version bump type (patch, minor, major)
3. Write a summary of your changes

A markdown file will be created in `.changeset/`. Commit this file with your changes.

### 4. Commit and Push

```bash
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
```

### 5. Create a Pull Request

Open a pull request on GitHub with a clear description of your changes.

## Version Bump Guidelines

| Change Type | Version | Example |
|-------------|---------|---------|
| Bug fixes, documentation | `patch` | 0.1.0 → 0.1.1 |
| New features (backward compatible) | `minor` | 0.1.0 → 0.2.0 |
| Breaking changes | `major` | 0.1.0 → 1.0.0 |

## Releasing

### Release Commands

We provide convenient scripts for the release process:

| Command | Description |
|---------|-------------|
| `pnpm release:check` | Run typecheck and build to verify everything is ready |
| `pnpm release:prepare` | Create a changeset (interactive) |
| `pnpm release:status` | Check status of pending changesets |
| `pnpm release:version` | Bump versions based on changesets and generate CHANGELOG |
| `pnpm release:publish` | Build and publish packages to npm |
| `pnpm release:full` | Run check, version bump, and publish in sequence |

### Release Workflow

**For maintainers releasing to npm:**

1. **Check readiness:**
   ```bash
   pnpm release:check
   ```

2. **Review pending changesets:**
   ```bash
   pnpm release:status
   ```

3. **Bump versions:**
   ```bash
   pnpm release:version
   ```
   This will:
   - Update package versions based on changesets
   - Generate/update CHANGELOG.md
   - Commit the changes

4. **Publish to npm:**
   ```bash
   pnpm release:publish
   ```
   This will:
   - Build all packages
   - Publish to npm (requires npm login)

**Or use the all-in-one command:**
```bash
pnpm release:full
```

> **Note**: Make sure you're logged into npm (`npm login`) and have access to the `@react-component-selector-mcp` organization before publishing.

## Code Style

- **TypeScript**: All code is written in TypeScript
- **ESM**: All packages use ES modules (`"type": "module"`)
- **Formatting**: Use your editor's default formatting (no strict enforcement yet)

## Troubleshooting

### pnpm install fails

```bash
# Clear pnpm cache and reinstall
pnpm store prune
rm -rf node_modules
pnpm install
```

### Build errors after pulling changes

```bash
pnpm clean
pnpm install
pnpm build
```

### TypeScript errors in IDE

Restart your TypeScript server. In VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server"

## Questions?

If you have questions or run into issues, please open a GitHub issue.
