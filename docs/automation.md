# Automation

This template keeps the automation close to the Snowflake-style onboarding flow while removing AWS discovery.

## Postman Onboarding

`.github/workflows/postman-onboarding.yml` runs on pushes to `main` unless the change is docs-only or generated Postman artifacts only. It can also be run manually.

The workflow reads `.postman-template/onboarding.yml`, validates that `api/openapi.yaml` exists, runs service unit tests, resolves a Postman service-account token, then calls `postman-cs/postman-api-onboarding-action@v2`.

The composite action is configured with `skip-built-in-tests: true`, so this workflow starts the local service itself, runs the generated Contract collection with JUnit output, optionally runs Smoke, uploads diagnostics, and only then pushes generated artifacts when `repo_write_mode=commit-and-push`.

Manual dispatch defaults to `commit-only`. Pushes to `main` default to `commit-and-push`, and generated commits are amended with `[skip actions]` to prevent recursive runs.

## Postman CI

`.github/workflows/postman-ci.yml` runs on PRs and manual dispatch. It skips cleanly until `.postman/resources.yaml` exists, which means deleting `.postman/` and `postman/` does not accidentally run the full suite before onboarding artifacts have been regenerated.

Once resources exist, the workflow starts the local service, resolves generated collection IDs from `.postman/resources.yaml`, runs Contract, optionally runs Smoke, uploads JUnit/log artifacts, and fails the check when those runs fail.

## PR Validation

`.github/workflows/postman-pr-validation.yml` runs on PRs that touch `api/**`, the onboarding template, or the validation workflow itself.

It compares the PR spec against the target branch with `openapi-changes`, runs Postman governance lint when `POSTMAN_API_KEY` is configured, writes a workflow summary, and posts or updates a sticky PR comment with the results.
