# Optional GitHub Actions workflow

`shared-tests.yml` is an example workflow for installing locked dependencies, building the PWA, running the shared test suite and checking native TypeScript syntax.

To enable it, copy the file to `.github/workflows/shared-tests.yml` and commit using a GitHub credential authorized to manage Actions workflows. The credential used for the initial source publication did not have the `workflow` scope, so this example is not installed as an active workflow.

The local publication run passed all 100 domain/content tests. This example does not run browser checks, compile Android/iOS or validate physical devices.
