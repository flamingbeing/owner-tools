# Notes

Lasting rules, owner preferences and lessons (never task chatter), and how to test.

- A page's repo is chosen by host in `worker/ask.js` (`REPOS`, default anawj-site). A new group repo gets a line there,
  its own `.github/workflows/page-edits.yml`, and the token needs it.
- The `GITHUB_ISSUES_TOKEN`, `ACCESS_TEAM` and `ACCESS_AUD` values live only in Cloudflare; without them the API answers 503.
- Group repos keep previews off, so Ask Claude shows no preview link for their pages.
- 21 Oct 2026: the page editor (`edit/`) was dropped; Ask Claude is the only way to send page edits. The rules for
  applying them are in `page-edits.md`.
