# Expand Metadata Fields Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the Gameday Designer metadata to include additional fields, ensure proper translations, and enforce specific validation rules.

**Architecture:**
- Update `GamedayMetadata` interface in `types/api.ts` and `types/flowchart.ts` (keeping them in sync).
- Expand `GamedayMetadataAccordion.tsx` with new form fields and ensure proper translations for all labels (including group and game names).
- Add validation logic to `useFlowValidation.ts`:
    - Date must be set (**ERROR**).
    - Date should be in the future (**WARNING** if in the past).
    - Venue (address) must not be empty (**WARNING**).
- Update `ListDesignerApp.tsx` to handle default values and validation propagation.

**Tech Stack:** React, TypeScript, React-Bootstrap, i18next.

---

### Task 1: Update Type Definitions

**Files:**
- Modify: `gameday_designer/src/types/api.ts`
- Modify: `gameday_designer/src/types/flowchart.ts`

**Step 1: Update GamedayMetadata in api.ts**
Ensure all required fields are present.

**Step 2: Update GamedayMetadata in flowchart.ts**
Ensure it matches `api.ts`.

**Step 3: Commit**
```bash
git add gameday_designer/src/types/api.ts gameday_designer/src/types/flowchart.ts
git commit -m "chore: expand GamedayMetadata type definitions"
```

### Task 2: Add Internationalization Keys

**Files:**
- Modify: `gameday_designer/src/i18n/locales/de/ui.json`
- Modify: `gameday_designer/src/i18n/locales/en/ui.json`
- Modify: `gameday_designer/src/i18n/locales/de/validation.json`
- Modify: `gameday_designer/src/i18n/locales/en/validation.json`

**Step 1: Add missing UI labels**
Ensure all labels, including group and game names, have correct translations.

**Step 2: Add validation error/warning messages**
Add keys for:
- `metadataDateMissing` (Error)
- `metadataDateInPast` (Warning)
- `metadataVenueMissing` (Warning)
- `metadataSeasonMissing` (Error)
- `metadataLeagueMissing` (Error)
- `metadataNameMissing` (Error)
- `metadataStartMissing` (Error)

**Step 3: Commit**
```bash
git add gameday_designer/src/i18n/locales/*/ui.json gameday_designer/src/i18n/locales/*/validation.json
git commit -m "feat: add translations for metadata fields and validation"
```

### Task 3: Enhance Metadata Accordion UI

**Files:**
- Modify: `gameday_designer/src/components/GamedayMetadataAccordion.tsx`

**Step 1: Verify all fields and labels**
Ensure "Season", "League", "Venue", etc., are correctly rendered with translated labels.

**Step 2: Commit**
```bash
git add gameday_designer/src/components/GamedayMetadataAccordion.tsx
git commit -m "feat: enhance metadata accordion form fields and translations"
```

### Task 4: Implement Strict Validation Logic

**Files:**
- Modify: `gameday_designer/src/hooks/useFlowValidation.ts`

**Step 1: Write the failing test for validation**
Create `gameday_designer/src/hooks/__tests__/useFlowValidation-metadata.test.ts`.
Test cases:
- Missing name/date/start/season/league -> ERRORS.
- Date in the past -> WARNING.
- Venue empty -> WARNING.

**Step 2: Run test to verify it fails**
Run: `npm --prefix gameday_designer run test:run gameday_designer/src/hooks/__tests__/useFlowValidation-metadata.test.ts`

**Step 3: Implement validation in useFlowValidation.ts**
Update `checkMandatoryMetadata` and add date/venue logic.

**Step 4: Run test to verify it passes**
Run: `npm --prefix gameday_designer run test:run gameday_designer/src/hooks/__tests__/useFlowValidation-metadata.test.ts`

**Step 5: Commit**
```bash
git add gameday_designer/src/hooks/useFlowValidation.ts gameday_designer/src/hooks/__tests__/useFlowValidation-metadata.test.ts
git commit -m "feat: implement strict metadata validation and warnings"
```

### Task 5: Default Value Logic

**Files:**
- Modify: `gameday_designer/src/components/ListDesignerApp.tsx`

**Step 1: Implement default values**
Ensure new gamedays get sensible defaults for new fields.

**Step 2: Commit**
```bash
git add gameday_designer/src/components/ListDesignerApp.tsx
git commit -m "feat: add default value logic for new gamedays"
```

### Task 6: Final Verification

**Step 1: Run all frontend tests**
Run: `npm --prefix gameday_designer run test:run`

**Step 2: Run Linting**
Run: `npm --prefix gameday_designer run lint`

**Step 3: Build check**
Run: `npm --prefix gameday_designer run build`

**Step 4: Commit**
```bash
git commit --allow-empty -m "chore: final verification of metadata expansion"
```