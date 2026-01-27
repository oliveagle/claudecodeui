# Claude Code UI - Project Instructions

## Development Commands

### Standard Commands
- `just dev` - Start dev server on port 7853 (node directly)
- `just build` - Build for production
- `just docker-build` - Build Docker image locally
- `just health` - Check health status
- `just version` - Show current version

### Production Deployment Commands (podman compose)

**`just up`** - Start production service
- Runs on **port 7853**
- Uses **latest** image from ghcr.io
- Main production service

**`just down`** - Stop production service

**`just prev-working`** - Emergency fallback (MANUALLY MAINTAINED)

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

## Container Workflow Skill

This project follows the **container-workflow** skill pattern for CI/CD and deployment.

When modifying container-related files (GitHub Actions, Dockerfiles, docker-compose, justfile), reference the `container-workflow` skill located at:
```
~/.agents/skills/container-workflow/
```

The skill defines standards for:
- GitHub Actions workflow (`docker-build.yml`)
- Multi-stage Docker builds (`Dockerfile.server`)
- Docker Compose orchestration (`docker-compose.yml`)
- Just command automation (container recipes in `justfile`)
- Version management and tagging
- Emergency fallback pattern (`just prev-working`)
