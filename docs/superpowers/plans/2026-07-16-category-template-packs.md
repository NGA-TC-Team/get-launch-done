# Category Template Packs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace screen-by-screen template selection as the primary workflow with app-category template packs that apply a complete 10-page screenshot sequence.

**Architecture:** Keep the existing `src/app/templates.ts` module as the source of template data, add category and pack metadata there, then wire the editor to apply pack sequences to all slots. Keep individual screen template overrides available for detailed editing.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.9, Bun test runner.

## Global Constraints

- Preserve current user edits in `src/app/page.tsx` and `src/app/globals.css`.
- Use Apple App Store and Google Play category surfaces as category source material.
- Every category must expose 3 to 7 full-sequence packs.
- Each pack must cover all 10 screenshot pages with valid `TemplateId` values.
- Add creative mockup layout families, including isometric and fake-3D variants.

---

### Task 1: Template Data Coverage

**Files:**
- Modify: `tests/templates.test.mjs`
- Modify: `src/app/templates.ts`

**Interfaces:**
- Produces: `SCREENSHOT_CATEGORY_GROUPS`, `SCREENSHOT_CATEGORY_PACKS`, `DEFAULT_CATEGORY_PACK_ID`, `getCategoryPackById(id)`

- [ ] Write failing tests for category groups, per-category pack counts, 10-page sequences, valid template IDs, and creative layout families.
- [ ] Implement new template families and template blueprints.
- [ ] Implement category groups and 3 to 7 pack definitions for every unified category.
- [ ] Run `bun test tests/templates.test.mjs` and confirm green.

### Task 2: Editor Pack Application

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `SCREENSHOT_CATEGORY_GROUPS`, `SCREENSHOT_CATEGORY_PACKS`, `DEFAULT_CATEGORY_PACK_ID`, `getCategoryPackById(id)`

- [ ] Add selected category pack state and persistence.
- [ ] Add `applyCategoryPack(packId)` that maps the pack sequence across all 10 slots and refreshes badges.
- [ ] Add sidebar controls for category group, pack selection, and pack summary.
- [ ] Keep the existing selected-screen template selector as an advanced override.

### Task 3: Creative Layout Rendering

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: expanded `TemplateFamily` values from `src/app/templates.ts`

- [ ] Add preview CSS for the new layout family classes and mini template thumbnails.
- [ ] Extend `getCanvasLayout()` for new families so export matches preview intent.
- [ ] Add canvas support for simple visual depth where the family calls for fake-3D or isometric placement.

### Task 4: Verification

**Files:**
- Existing test and app files only.

- [ ] Run `bun test`.
- [ ] Run `bun run lint`.
- [ ] Run `bun run build`.
- [ ] Audit every objective requirement against current code and command output before marking the goal complete.
