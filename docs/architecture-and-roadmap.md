# Architecture and Roadmap

This repo is moving to a container-first architecture.

## Primary runtime

- Azure Container App: the main product runtime.
- It should host the real MCP/agent/workflow service, not a placeholder image.
- Use a custom image built from this repo, not the portal quickstart image.

## Secondary runtime

- Static Web Apps: user-facing UI shell only.
- Keep SWA as the front door for the browser experience, but do not make it the system of record for orchestration.
- SWA should call the container-backed service or a supporting API layer.

## Supporting layer

- Azure Functions: document parsing, extraction helpers, exports, and thin utility routes.
- Functions stay useful for request/response work that fits the current repo.

## Recommended container image

- Base image: `node:20-bookworm-slim`.
- Reason: this keeps the image simple, modern, and compatible with the Node 20 baseline already adopted in the repo.
- Expose the port your app actually listens on, commonly `3000` for Node services.
- If the container becomes an agent worker, the image should run that worker process directly.

## Files to add next

1. `container/` or `agent/` app code for the real MCP service.
2. A project `Dockerfile` for the container runtime.
3. A small HTTP health endpoint or tool endpoint for readiness checks.
4. Any shared schema/config files the SWA UI and container runtime both need.
5. A deployment manifest or workflow that builds and pushes the custom image.

## What stays now

- `src/` as the UI shell.
- `api/` as the supporting Functions layer.
- The Tulip design files in `look/` as product-spec references.
- The dev container for local development.

## What becomes optional or temporary

- The old placeholder/demo endpoint model.
- Any workflow that deploys a service which is not the real container runtime.
- A separate container app only for experimentation or placeholder images.

## Recommended build order

1. Build the real container service code.
2. Add the Dockerfile and container deployment workflow.
3. Keep SWA as the browser UI that consumes the container/API.
4. Keep Functions for extraction helpers and export utilities.
5. Add the MCP/agent orchestration once the end-to-end workflow is stable.

## Tulip takeaways worth reusing

- Classify first, match second, extract third, reconcile fourth.
- Keep uncertain values visible rather than guessing.
- Use a clear source-priority model.
- Treat the agent as a later reviewer, not the system of record.

## Decision rule

If a file, workflow, or Azure resource does not support the real container runtime or the first browser flow, it should be treated as temporary until the core user flow works end to end.