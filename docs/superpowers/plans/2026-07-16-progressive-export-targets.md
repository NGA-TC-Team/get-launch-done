# Progressive Export Targets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce first-entry UI pressure and export only the store screenshot specifications selected in the left sidebar.

**Architecture:** Keep platform/store metadata in `src/app/platforms.ts`, generate ZIP targets from selected target IDs in `src/app/export-targets.ts`, and keep the editor state local to `src/app/page.tsx`. The UI defaults to phone-only export and reveals tablet/TV/watch settings in a progressive disclosure panel.

**Tech Stack:** Next.js 16, React 19, TypeScript, Bun test, CSS modules via `src/app/globals.css`.

## Global Constraints

- Default app body font size is `14px`.
- iOS export must no longer automatically include iPad.
- Export output must follow selected sidebar specifications.
- Initial UI should expose only primary setup choices; advanced or less-common settings stay collapsed.
- Store specs are based on official Apple App Store Connect and Google Play Console screenshot requirements checked on 2026-07-16.
- Use Bun for tests, lint, and build commands.

---

### Task 1: Export Target Model

**Files:**
- Modify: `src/app/platforms.ts`
- Modify: `src/app/export-targets.ts`
- Test: `tests/export-targets.test.mjs`
- Test: `tests/platforms.test.mjs`

**Interfaces:**
- Produces: `type StoreTargetId`, `storeTargetSpecs`, `getDefaultStoreTargetIds(platformKey)`, `getStoreTargetSpecs(platformKey, selectedTargetIds)`, `getExportTargets({ targetSpecs, count, extension })`.

- [x] Write failing tests proving iOS phone-only export omits iPad by default and selected tablet/TV/watch targets generate separate folders.
- [x] Run `bun test tests/export-targets.test.mjs tests/platforms.test.mjs` and confirm the old implementation fails.
- [x] Add store target metadata and update `getExportTargets` to consume explicit target specs.
- [x] Run the same Bun tests and confirm they pass.

### Task 2: Editor State and Sidebar UI

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: target helpers from Task 1.
- Produces: selected target state persisted in the draft, a compact default sidebar, collapsed advanced target and background controls, and selected-target export summaries.

- [x] Add selected target IDs to state, persistence, draft parsing, and platform switching.
- [x] Replace the existing platform-only sidebar with a compact default target summary and an expandable "추가 규격" section for tablet, TV, and watch targets.
- [x] Update export file count, ZIP folder labels, readiness cards, and topbar status to reflect selected target specs.
- [x] Set `body { font-size: 14px; }` and adjust compact controls so labels do not overflow.

### Task 3: Verification

**Files:**
- Verify current worktree.

- [x] Run `bun test`.
- [x] Run `bun run lint`.
- [x] Run `bun run build`.
- [x] Audit the explicit user requirements against current code and command output before reporting completion.
