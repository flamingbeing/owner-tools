# owner-tools

The site owner's own tools for changing the other sites' pages:

- `ask/`: Ask Claude, a one-page form at ask.anawj.com (behind Cloudflare Access) that opens a "Page edits:" issue in the
  repo that owns the page. Its API is `worker/ask.js`; `REPOS` there says which repo owns each host (today only the hand host; every other host falls back to `anawj-site`).
- `page-edits.md`: how those issues become PRs (the rules for applying them, the instant workflow, Ask Claude's setup).

Checks: `node tools/check.mjs`, then `node ask/test/e2e.mjs`.
