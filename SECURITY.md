# Security Policy

## Scope

One Page Calendar is a static, client-side page. It has no backend, no
database, no authentication, no network calls, and stores nothing — the whole
app is date arithmetic against the browser's `Date`. There is no user data to
breach and no server to compromise.

That leaves a realistic threat surface of three things:

1. **The dependency tree** — a malicious or vulnerable npm package reaching
   the built bundle.
2. **The build and release pipeline** — a workflow that hands a write-capable
   token to attacker-controlled code.
3. **The published page itself** — a defacement via unauthorized deploy.

The controls below target those three.

## Reporting a vulnerability

Report privately via GitHub's **Security → Report a vulnerability** tab
(private vulnerability reporting), not a public issue. Expect an initial reply
within seven days.

If the report concerns a dependency rather than this code, please open a normal
public issue instead — that information is already public.

## Automated controls

| Control | Where | What it catches |
| --- | --- | --- |
| CodeQL, `security-extended` | `.github/workflows/codeql.yml` | Injection, unsafe DOM sinks, and prototype-pollution patterns in the app source. Runs on push, on PRs, and weekly so new queries reach a dormant repo. |
| Dependency review | `.github/workflows/dependency-review.yml` | A pull request that would introduce a dependency with a known advisory at moderate severity or above. Fails the PR before merge. |
| Dependabot | `.github/dependabot.yml` | Vulnerable and stale dependencies in `package.json` and in the workflow actions themselves. Weekly, grouped. |
| Least-privilege tokens | every workflow | Workflows default to `permissions: {}`; each job opts into only the scopes it needs. |

## Pipeline hardening

The deploy workflow runs on `pull_request` as well as `push`, which means it
executes PR-controlled npm lifecycle scripts and build code. Three properties
keep that from being a path to repository write access:

- **The default grant is empty.** `permissions: {}` at the workflow level means
  a job with no `permissions:` block gets nothing.
- **The build job cannot publish.** It holds `contents: read` and `pages: read`.
  The publish-capable scopes (`pages: write`, `id-token: write`) live only on
  the `deploy` job, whose sole step is `actions/deploy-pages`. No PR-controlled
  code runs in that job. Putting an `if` on a deploy *step* would not be
  equivalent — earlier steps in the same job would still hold the token.
- **No credentials are left on disk.** Every checkout uses
  `persist-credentials: false`, so no token is written into `.git/config` for
  later steps to pick up.

Deployment uses OIDC (`id-token: write`) against the `github-pages`
environment rather than pushing to a `gh-pages` branch, so no long-lived token
or branch write is involved in publishing.

## Repository settings

Some controls are not files and must be enabled in the web UI. See the
Deployment section of the README for the required setup.
