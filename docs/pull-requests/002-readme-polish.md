# PR #2 — README badges, mascot, and index

**Branch:** `rb/readme-polish`  
**Target:** `main`

## Summary

Improve the README's project identity and navigation without rewriting its existing
prose. Present the header in this order: title, astronaut image, badges, a four-sentence
short description, and the index.

## Changes

- Keep the existing Code checks and GitHub Pages workflow badges.
- Add TypeScript, Vite, Vitest, and MIT license badges based on this repository's stack.
- Display `Assets/images/floating.png` as a centered 160-pixel astronaut mascot image with
  descriptive alternative text, directly below the title.
- Place the existing four-sentence opening description after the badges and before the index.
- Add an index linking to the README's existing sections and subsections. Explicit anchor
  IDs keep links stable for headings that include emoji or numbered titles.
- Keep the existing description wording unchanged while moving it into the requested order;
  leave all other README text unchanged.
- Record the README update in `docs/CHANGELOG.md` and the team progress/task logs.

## Validation

- `git diff --check` — passed.
- Verified all 21 index links resolve to explicit README anchors.
- Verified the referenced mascot image exists in the repository.
- No application code or behavior changed; application tests were not rerun.

## Review checklist

- [x] Branch is based on the latest `origin/main`.
- [x] Existing README prose is unchanged.
- [x] Header order is title, image, badges, short description, then index.
- [x] New badges reflect dependencies and license declared by the repository.
- [x] Header image is a project asset with alt text.
- [x] Index links have explicit matching anchors.
