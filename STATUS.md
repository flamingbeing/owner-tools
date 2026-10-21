# Status

## Now
- Imported from the main site repo (21 Oct 2026): ask, edit, the Ask Claude API and its tests; issues open in the repo
  that owns the page.

## Waiting on the owner
- Connect this repo to a Worker in Workers Builds, and move ask.anawj.com off the old Worker.
- Widen the Ask Claude GitHub token (Worker secret) to the other repos in `REPOS`, and add `CLAUDE_CODE_OAUTH_TOKEN`
  as an Actions secret in each of them.

## Next (in order)
1. Landing step: the editor's own address moves here.

## Recently done
- Worker, API and tests for the host-to-repo map.

## Decisions (dated, one line each)
- 21 Oct 2026: each page-owning repo carries its own copy of `page-edits.yml`; Ask Claude and the editor pick the repo.
