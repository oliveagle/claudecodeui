# Claude Code UI Documentation

## Documentation Structure

```
docs/
├── proposals/       # RFC-style design proposals
│   └── *.md         # Detailed proposal documents
├── features/        # Feature ideas and roadmap
│   ├── README.md    # Feature overview and status
│   └── *.md         # Individual feature specs
└── README.md        # This file
```

## Proposals

Design proposals follow the RFC (Request for Comments) pattern:
- **Status**: Draft | Proposed | Approved | Implemented | Deprecated
- **Purpose**: Design major features before implementation
- **Process**: Discussion → Approval → Implementation → Review

See [`proposals/`](./proposals/) for active proposals.

## Features

Feature ideas and specifications at various stages:
- **Idea**: Initial concept, needs discussion
- **Planned**: Approved, awaiting implementation
- **In Progress**: Currently being developed
- **Done**: Implemented and released

See [`features/`](./features/) for the feature roadmap.

## Contributing

When proposing a new feature:
1. Check existing proposals and features first
2. Create a proposal in `docs/proposals/` for major features
3. Create a feature spec in `docs/features/` for smaller features
4. Discuss and get approval before implementing
