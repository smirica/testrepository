# Testrepository

This repo is now moving to a container-first product shape.

## Current direction

- Make the Azure Container App the primary runtime for the real MCP/agent/workflow service.
- Keep Static Web Apps as the secondary browser UI shell.
- Keep Azure Functions as the supporting extraction and utility layer.
- Use the Tulip files in `look/` as product and logic references.

## Working notes

- Front end lives in `src/`.
- API lives in `api/`.
- Deployment is currently wired through GitHub Actions.
- Local dev is wired through the dev container.

## Next build target

- Create a real custom container image from this repo.
- Add the container service code and a Dockerfile.
- Keep SWA connected to the browser UI, not as the system of record.

## Roadmap

See [docs/architecture-and-roadmap.md](docs/architecture-and-roadmap.md) for the container-first plan, the suggested image base, and the file list to add next.