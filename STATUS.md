# Status

## Now
- Ask Claude only (the page editor was dropped 21 Oct 2026); issues open in the repo that owns the page.

## Waiting on the owner
- Connect this repo to a Worker in Workers Builds, and move ask.anawj.com off the old Worker.
- Widen the Ask Claude GitHub token (Worker secret) to the other repos in `REPOS`, and add `CLAUDE_CODE_OAUTH_TOKEN`
  as an Actions secret in each of them.

## Next (in order)
- Nothing planned.

## Recently done
- Page editor (`edit/`) removed; its rules for applying page edits kept in `page-edits.md`.
- Worker, API and tests for the host-to-repo map.

## Decisions (dated, one line each)
- 21 Oct 2026: each page-owning repo carries its own copy of `page-edits.yml`; Ask Claude picks the repo.
- 21 Oct 2026: page editor dropped (owner); Ask Claude only.
