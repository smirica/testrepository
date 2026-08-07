# Container App Plan

This is the primary runtime plan for the product.

## Target container app

- Name: `reading-gator-containerapp`
- Purpose: host the real MCP/agent/workflow service
- Role: primary backend/runtime, not a placeholder

## Recommended image

- Base image: `node:20-bookworm-slim`
- Build the image from this repository so the service code and deployment stay together
- Expose the service port used by the app, commonly `3000`

## What the container should run

- MCP tool server or workflow orchestration service
- Health endpoint for readiness checks
- Shared model and schema code for the agent/tool layer

## What stays secondary

- Static Web Apps for the browser UI
- Azure Functions for extraction helpers, export helpers, and small utility endpoints

## Files to create next

1. `container/` source folder for the runtime service
2. `container/Dockerfile` for the custom image
3. `container/package.json` for the container service runtime
4. A workflow that builds and pushes the image
5. A runtime config file for the target port and environment variables

## Scaffolded now

- `container/src/server.js` provides a real HTTP service skeleton.
- `container/Dockerfile` builds the service image from this repo.
- `container/.dockerignore` keeps the build context clean.
- `.github/workflows/deploy-container-app.yml` now targets `reading-gator-containerapp` and the `container/` build context.

## Build order

1. Create the container service code.
2. Add the Dockerfile.
3. Add the deployment workflow.
4. Keep SWA only for the user interface.
5. Wire the container service into the UI and supporting Functions layer.
