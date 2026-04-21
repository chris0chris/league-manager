# League Team Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable selecting existing league teams when generating a tournament from a template.

**Architecture:** Update `TemplateLibraryModal` to pass full `GlobalTeam` objects and `useDesignerController` to integrate these teams into the flowchart state before generation.

**Tech Stack:** React (TypeScript), Bootstrap-React, Vitest.

---

### Task 1: Update `TemplateLibraryModal.tsx` Interface

**Files:**
- Modify: `gameday_designer/src/components/modals/TemplateLibraryModal.tsx`

**Step 1: Update the `onGenerateFromBuiltin` and `onGenerateFromSavedTemplate` callback signatures**

Update the `onGenerateFromBuiltin` callback to accept `selectedTeams: GlobalTeam[]` instead of `selectedTeamIds: string[]`.
Update the `onGenerateFromSavedTemplate` callback to also accept `selectedTeams: GlobalTeam[]`.

**Step 2: Update `handleTeamConfirm` to pass full team objects**

Find the `handleTeamConfirm` function and update it to map `selectedIds` back to the `GlobalTeam` objects from `allTeams`.

**Step 3: Commit**

```bash
git add gameday_designer/src/components/modals/TemplateLibraryModal.tsx
git commit -m "feat: update TemplateLibraryModal to pass full team objects"
```

---

### Task 2: Update `ListDesignerApp.tsx` to Forward Selected Teams

**Files:**
- Modify: `gameday_designer/src/components/ListDesignerApp.tsx`

**Step 1: Update the `TemplateLibraryModal` props in `ListDesignerApp.tsx`**

Update the `onGenerateFromBuiltin` and `onGenerateFromSavedTemplate` handlers to receive `selectedTeams` and pass them to `handleGenerateTournament`.

**Step 2: Commit**

```bash
git add gameday_designer/src/components/ListDesignerApp.tsx
git commit -m "feat: forward selected teams in ListDesignerApp"
```

---

### Task 3: Update `useDesignerController.ts` to Handle Selected Teams

**Files:**
- Modify: `gameday_designer/src/hooks/useDesignerController.ts`

**Step 1: Update `handleGenerateTournament` to accept `selectedTeams: GlobalTeam[]`**

Update the function signature and add logic to ensure these teams are added to the `flowState` before tournament generation.

**Step 2: Implement team-to-group assignment logic for selected teams**

For both built-in and saved templates, ensure that selected teams are correctly assigned to the groups defined in the template.

**Step 3: Commit**

```bash
git add gameday_designer/src/hooks/useDesignerController.ts
git commit -m "feat: integrate selected teams in handleGenerateTournament"
```

---

### Task 4: Verification

**Files:**
- Create: `gameday_designer/src/hooks/__tests__/useDesignerController.test.ts`

**Step 1: Add a unit test for team integration**

Verify that `handleGenerateTournament` correctly adds selected league teams to the state.

**Step 2: Run tests**

Run: `npm run test:run` in `gameday_designer`
Expected: PASS

**Step 3: Commit**

```bash
git add gameday_designer/src/hooks/__tests__/useDesignerController.test.ts
git commit -m "test: verify selected team integration"
```
