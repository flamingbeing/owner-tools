# Notes

Lasting rules, owner preferences and lessons (never task chatter), and how to test.

- A page's repo is chosen by host in `worker/ask.js` (`REPOS`, default anawj-site) and by path in `edit/index.html`
  (`REPOS`). A new group repo gets a line in both, its own `.github/workflows/page-edits.yml`, and the token needs it.
- The `GITHUB_ISSUES_TOKEN`, `ACCESS_TEAM` and `ACCESS_AUD` values live only in Cloudflare; without them the API answers 503.
- Group repos keep previews off, so Ask Claude shows no preview link for their pages.
- The editor's browser test edits made-up sample pages in `edit/test/pages/`; the real pages live in other repos.
- The design kit loads from https://design.anawj.com/v1/ (the editor's QR code).
