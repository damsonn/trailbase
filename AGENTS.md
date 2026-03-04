# Agent Instructions

## Project Overview

**TrailBase** — TypeScript monorepo: `server/` (Hono), `app/` (React/Vite), `shared/` (Zod schemas, GPX, geo utils), `mobile/` (future).

### Docs (source of truth)

- [docs/PRD.md](docs/PRD.md) — product requirements
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design, data model, API, adapters

## Conventions

- Repository pattern for data access
- All API responses use envelope pattern (`{ data, meta }` / `{ error }`)
- Write tests for all service-layer logic
- Zod schemas in `shared/` are the single source of truth for validation

## Project Tracking (Two Layers)

### GitHub Issues — public roadmap

- **Milestones** = release phases (e.g., `v0.0 - Foundation`, `v0.1 - MVP`)
- **Epic issues** = coarse feature areas (auth, route builder, GPX, etc.)
- **Labels** = categorization (`backend`, `frontend`, `shared`, `infra`, `design`, `bug`, `enhancement`, `epic`)
- Use `gh` CLI to interact with issues
- GitHub Issues are the contributor-facing view — do not create granular implementation tasks here

### Beads (`bd`) — execution graph

- **All granular task tracking lives in beads**, not GitHub Issues
- Beads manages the DAG of implementation tasks with dependencies, priorities, and status
- When starting work on a GitHub epic, convert its scope into beads tasks
- Close the GitHub epic when all its beads tasks are done

<!-- BEGIN BEADS INTEGRATION -->
## Issue Tracking with bd (beads)

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work atomically
bd close <id>         # Complete work
bd sync               # Sync with git
```

### Creating Issues

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="Details" -p 1 --deps discovered-from:bd-123 --json
```

### Issue Types

- `bug` — something broken
- `feature` — new functionality
- `task` — work item (tests, docs, refactoring)
- `epic` — large feature with subtasks
- `chore` — maintenance (dependencies, tooling)

### Priorities

- `0` — Critical (security, data loss, broken builds)
- `1` — High (major features, important bugs)
- `2` — Medium (default)
- `3` — Low (polish, optimization)
- `4` — Backlog (future ideas)

### Agent Workflow

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task atomically**: `bd update <id> --claim`
3. **Work on it**: implement, test, document
4. **Discover new work?** Create linked issue:
   `bd create "Found bug" --description="Details" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Auto-Sync

bd automatically syncs with git:

- Exports to `.beads/issues.jsonl` after changes (5s debounce)
- Imports from JSONL when newer (e.g., after `git pull`)
- No manual export/import needed

### Rules

- Use `bd` for all granular task tracking
- Always use `--json` flag for programmatic use
- Link discovered work with `discovered-from` dependencies
- Check `bd ready` before asking "what should I work on?"
- Do NOT create markdown TODO lists for task tracking

## Landing the Plane (Session Completion)

When ending a work session, complete ALL steps below. Work is NOT complete until `git push` succeeds.

1. **File issues for remaining work** — create beads issues for anything needing follow-up
2. **Run quality gates** (if code changed) — tests, linters, builds
3. **Update issue status** — close finished work, update in-progress items
4. **Push to remote**:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # Must show "up to date with origin"
   ```
5. **Clean up** — clear stashes, prune remote branches
6. **Verify** — all changes committed and pushed
7. **Hand off** — provide context for next session
<!-- END BEADS INTEGRATION -->

## Non-Interactive Shell Commands

Always use non-interactive flags with file operations to avoid hanging on confirmation prompts.

```bash
cp -f source dest           # NOT: cp source dest
mv -f source dest           # NOT: mv source dest
rm -f file                  # NOT: rm file
rm -rf directory            # NOT: rm -r directory
```

Other commands that may prompt:
- `scp` — use `-o BatchMode=yes`
- `ssh` — use `-o BatchMode=yes`
- `apt-get` — use `-y` flag
- `brew` — use `HOMEBREW_NO_AUTO_UPDATE=1`
