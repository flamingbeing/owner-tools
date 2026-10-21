# owner-tools

The site owner's own tools for changing the other sites' pages:

- `ask/`: Ask Claude, a one-page form at ask.anawj.com (behind Cloudflare Access) that opens a "Page edits:" issue in the
  repo that owns the page. Its API is `worker/ask.js`.
- `edit/`: the page editor (comment on, or reword, a page and send the batch as a GitHub issue to the owning repo).
  Still served from anawj.com/edit/ until the landing step of the repo split; this repo holds its code.

`worker/routes.js` `REPOS` (in `worker/ask.js`) says which repo owns each host; the editor has the same map for paths.
Checks: `node tools/check.mjs`, then `node edit/test/e2e.mjs` and `node ask/test/e2e.mjs`.
