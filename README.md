# Adaptavist Provisions Demo Template

Use this repository to run the Postman API onboarding workflow hands-on.

The service code lives in `src/`, the OpenAPI source of truth lives in `api/openapi.yaml`, and the onboarding configuration lives in `.postman-template/onboarding.yml`.

## 1. Configure GitHub

Add this repository secret:

- `POSTMAN_API_KEY`: Postman service account API key.

Add these repository variables if needed:

- `POSTMAN_REGION`: `us` or `eu`. Defaults to `us`.
- `POSTMAN_ORG_MODE`: `true` or `false`. Defaults to `true`.
- `POSTMAN_WORKSPACE_TEAM_ID`: optional sub-team ID for workspace creation. Leave blank to use the team ID resolved from `POSTMAN_API_KEY`.
- `POSTMAN_SYSTEM_ENV_MAP_JSON`: optional Catalog system-environment mapping, for example `{"prod":"<system-env-uuid>"}`.
- `POSTMAN_RUN_SMOKE`: set to `true` only when you want PR CI to run Smoke by default.

## 2. Run The Onboarding Workflow

In GitHub, open **Actions** and run **Postman Onboarding** manually.

Use these inputs for the first workshop run:

- `repo_write_mode`: `commit-and-push`
- `collection_sync_mode`: `refresh`
- `run_smoke`: `false`
- `requester_email`: leave blank unless you want to override `.postman-template/onboarding.yml`

The workflow will:

- Run the local service unit tests.
- Upload `api/openapi.yaml` to Postman.
- Generate the baseline, Contract, and Smoke collections.
- Sync generated `.postman/` and `postman/` artifacts back to `main`.
- Start the local API in CI.
- Run the generated Contract collection with JUnit output.
- Upload Postman CLI logs and JUnit diagnostics.

Smoke is disabled by default so the workshop focuses on onboarding and contract validation first.

## 3. Confirm Generated Artifacts

After the workflow finishes, confirm that `main` contains generated Postman files:

- `.postman/resources.yaml`
- Generated collection exports under `postman/`

Generated commits are amended with `[skip actions]`, and the onboarding workflow ignores `.postman/**` and `postman/**` pushes, so syncing artifacts to `main` will not create an Actions loop.

## 4. Test The PR Flow

Create a branch and change `api/openapi.yaml` or the service implementation.

When you open a PR, GitHub runs:

- **Postman PR Validation** for OpenAPI breaking-change detection, Postman governance linting, and a sticky PR comment.
- **Postman CI** for local service startup, generated Contract execution, optional Smoke execution, and JUnit/log upload.

If you want to demonstrate a breaking change, remove or rename a response field from `api/openapi.yaml` and open a PR against `main`.

## Local Service Checks

Run unit tests:

```sh
npm test
```

Start the service:

```sh
npm start
```

The API listens at `http://127.0.0.1:4010`.
