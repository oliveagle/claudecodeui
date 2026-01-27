# Claude Code UI - Project Instructions

## Development Commands

### Standard Commands
- `just dev` - Start dev server on port 7853
- `just build` - Build for production
- `just docker-build` - Build Docker image locally
- `just health` - Check health status
- `just version` - Show current version

### Emergency Recovery Command

**`just prev-working`** - MANUALLY MAINTAINED fallback command

This command is intended for **extreme cases only** when the latest version has critical issues and service availability must be guaranteed.

**Important Notes:**
- This command is **manually maintained** - the version number must be updated by hand when a new stable version is confirmed
- Runs on **port 7854** (separate from main service on port 7853)
- Not for normal use - only as emergency fallback
- To update: edit the `VERSION` variable in the `prev-working` recipe in justfile

**Example usage when latest version is broken:**
```bash
just prev-working  # Starts version 1.15.1 on port 7854
```

Then update the justfile with a new confirmed stable version when ready.

## Version Management

- Current version: See `VERSION` file
- Bump patch: `just version-bump`
- Bump minor: `just version-bump-minor`
- Create tag: `just version-tag`
