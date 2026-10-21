# owner-tools

Instructions for every AI assistant working here (Claude Code reads this through `CLAUDE.md`).
The site owner's own tools: Ask Claude (`ask/`, ask.anawj.com, owner-only) and the page editor (`edit/`). They open "Page edits:" issues in whichever repo owns the page. Only the owner uses them.

## Public here, private elsewhere

Anything merged here is public. Keep only code, docs, general rules and **made-up** sample data. Never commit
secrets, tokens, personal data, real names or patient details. Private notes belong in the owner's private notes
repo; never copy anything from there into this repo, a PR or an issue (neutral pointers like "ask the owner" are fine).

## Rules that bite

- One Worker (`worker/`) serves ask.anawj.com; its only API is `/api/ask` (`worker/ask.js`), which checks the Cloudflare Access token itself.
- Page-to-repo maps: `REPOS` in `worker/ask.js` and in `edit/index.html`; keep them equal.
- No secrets here: the Worker's values are set in Cloudflare.

## Checks before merging

```
node tools/check.mjs        # repo checks + Worker tests
node tools/proofread.mjs    # page and doc mistakes
node edit/test/e2e.mjs && node ask/test/e2e.mjs   # browser tests (PLAYWRIGHT_PATH, CHROMIUM_PATH)
```

## Working with the owner

- Instructions mostly come from a phone. Work through a request to the end; ask only when a decision is genuinely
  the owner's. When asked to plan, plan and wait.
- Keep each PR small and finished on its own. Start PR titles with the app: "Ask: …" or "Edit: …".
- Merge your own PRs once the checks pass, then report with the PR link (merge by the number the PR creation
  returned). After opening a PR, call `unsubscribe_pr_activity` at once: each PR event re-sends the whole context.
- Push once per finished step, not after every small commit (limited build minutes).
- Each app keeps `NOTES.md` (lasting decisions, how to test) and `STATUS.md` (now, waiting on the owner, next,
  dated decisions). Read them before starting; update them when a task finishes. Cheap end of session: `quick-save`.
- Plain words, short; explain technical terms briefly the first time.

## Token savers

- One repo per session: `.claude/settings.json` is only read when a session has exactly one repo attached.
- `.claude/settings.json` denies reading `__/` and `vendor/` folders. Add generated files and very large files to its
  `deny` list (edit their build scripts instead), and say so here. Ask the owner if one is really needed.
- Run only the touched app's tests while iterating and the full run once before merge. Screenshots only for visual
  changes (one, viewport-sized); debug logic with text.
