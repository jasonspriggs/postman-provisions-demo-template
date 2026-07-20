# Adaptavist Provisions Demo Template

This repository is a hands-on Postman API onboarding workshop template for Adaptavist. It intentionally starts from a repo-owned OpenAPI contract instead of AWS spec discovery, then uses the Postman composite onboarding action to create and sync the Postman workspace, generated collections, repository artifacts, and CI checks.

The demo API is a small access provisioning service. It models requestable access packages, access requests, approval decisions, and fulfillment status, which gives the generated contract tests enough schema detail to be meaningful.

## What The Workshop Shows

- A realistic local API implementation in `src/`.
- A fleshed-out OpenAPI source of truth in `api/openapi.yaml`.
- Postman composite onboarding through `postman-cs/postman-api-onboarding-action@v2`.
- Local service startup in CI before generated Contract tests run.
- Optional Smoke collection execution.
- JUnit and log artifact upload for test diagnostics.
- PR validation with OpenAPI breaking-change detection, Postman governance linting, and a sticky PR comment.

## Local Commands

Run the unit tests:

```sh
npm test
```

Start the service:

```sh
npm start
```

The API listens at `http://127.0.0.1:4010`.

## GitHub Configuration

Required secret:

- `POSTMAN_API_KEY`: Postman service account API key.

Useful repository variables:

- `POSTMAN_REGION`: `us` or `eu`. Defaults to `us`.
- `POSTMAN_ORG_MODE`: `true` or `false`. Defaults to `true` for this workshop.
- `POSTMAN_WORKSPACE_TEAM_ID`: optional sub-team override for workspace creation. When omitted, the onboarding workflow uses the team ID resolved from `POSTMAN_API_KEY`.
- `POSTMAN_SYSTEM_ENV_MAP_JSON`: optional system environment mapping such as `{"prod":"<system-env-uuid>"}`.
- `POSTMAN_RUN_SMOKE`: set to `true` to run Smoke by default in the PR CI workflow.

## Recommended Flow

1. Configure `POSTMAN_API_KEY` and any needed variables.
2. Run `Postman Onboarding` manually.
3. Use `repo_write_mode=commit-and-push` when you want the generated `.postman/` and `postman/` artifacts written back to `main`.
4. Open a PR that changes `api/openapi.yaml` or the service implementation.
5. Review the PR validation comment and the Postman CI JUnit/log artifacts.

The onboarding workflow ignores generated Postman artifact-only pushes and amends generated commits with `[skip actions]`, so writing artifacts to `main` does not start a recursive workflow loop.
