# PR — Gate production deployment on successful CI

**Branch:** `rb/vercel-deploy-gate`  
**Target:** `main`

## Summary

Replace GitHub Pages deployment with a Vercel production deployment initiated by GitHub
Actions only after the `Code checks` workflow passes on a push to the repository's default
branch. Disable Vercel's native Git-triggered deployment path so failed or unchecked commits
cannot create a parallel deployment.

## Changes

- Update `.github/workflows/deploy.yml` to wait for completion of `Code checks` and fail its
  gate unless the run succeeded for a push to the default branch.
- Check out the exact commit that passed CI, pull Vercel's production settings, build with
  the pinned Vercel CLI, and deploy the prebuilt output to Vercel.
- Require the `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` GitHub repository
  secrets; the workflow reports a clear error if one is missing.
- Add `vercel.json` with native Git deployments disabled to prevent an ungated duplicate.
- Update README workflow badges to identify Vercel deployment and link to the original
  repository's workflows.
- Update deployment decisions, changelog, architecture, codebase integration notes, and
  team task/progress records.

## Validation

- `npm run check` — passed.
- `npm test` — passed (187 tests).
- `npm run build` — passed.
- Parsed `.github/workflows/deploy.yml` and `vercel.json` successfully.

The actual Vercel deployment was not run locally because deployment uses repository
secrets. Configure the three Vercel secrets and link the Vercel project to this repository
before merging or expecting production deployment.

## Review checklist

- [x] Work is on a feature branch based on local `main`; `main` is unchanged.
- [x] Failed CI cannot reach the Vercel deploy job.
- [x] Vercel's automatic Git deployments are disabled to prevent an alternate path.
- [x] README badge links target the original repository.
- [ ] Configure the three Vercel repository secrets and verify a successful deployment.
