# Architecture and Roadmap

This repo is being shaped into a document-ingestion product with a user-facing front end, an API layer, and optional agent/tooling later.

## What stays now

- Front end in `src/`.
- Azure Functions API in `api/`.
- Static Web Apps workflow for GitHub deployment.
- Dev container for local development.
- The Tulip design files in `look/` as product-spec references.

## What is optional later

- A central MCP-driven agent.
- A separate Azure Container App runtime for long-running agent or worker tasks.
- Workflow orchestration beyond the core upload/extract/edit/export flow.

## What is not required for the first product slice

- Multiple overlapping deployment paths.
- Duplicate demo endpoints that do not support the main workflow.
- Separate app containers unless they are serving a real worker role.

## Recommended build order

1. User uploads documents.
2. API extracts candidate fields and line items.
3. Front end shows an editable template.
4. User edits and saves the template.
5. PDF export is generated from the saved template.
6. History and pattern-reporting are added.
7. MCP agent review is added last.

## Current repo interpretation

- `src/app.js` currently calls `/api/message`, which is only a placeholder check.
- `api/src/functions/message.js` is the main sample API endpoint.
- `api/src/functions/javaproj.js` is a second demo endpoint and can be removed once it is no longer useful.
- `.github/workflows/azure-static-web-apps-thankful-bay-07257340f.yml` is the primary deployment workflow for this repo.
- `.github/workflows/deploy-container-app.yml` is a separate Azure Container Apps path and should be treated as optional until it serves a real worker or agent role.

## Tulip takeaways worth reusing

- Classify first, match second, extract third, reconcile fourth.
- Keep uncertain values visible rather than guessing.
- Use a clear source-priority model.
- Treat the agent as a later reviewer, not the system of record.

## Decision rule

If a file, workflow, or Azure resource does not support the first vertical slice, it should be treated as optional until the core user flow is working end to end.