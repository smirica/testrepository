# Testrepository

This repo is being shaped into a document-ingestion product with a user-facing front end, an Azure Functions API, and optional agent/tooling later.

## Current direction

- Keep the Static Web Apps + Functions path as the primary app runtime.
- Use the Tulip files in `look/` as product and logic references.
- Add MCP-driven agent behavior only after the core upload/extract/edit/export flow is stable.
- Treat a separate Container App as optional until it has a real worker or agent job.

## Working notes

- Front end lives in `src/`.
- API lives in `api/`.
- Deployment is currently wired through GitHub Actions.
- Local dev is wired through the dev container.

## Roadmap

See [docs/architecture-and-roadmap.md](docs/architecture-and-roadmap.md) for the keep / phase later / remove map and the recommended build order.