# Fix Gameday Designer Failing Tests

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 15 failing tests in the `gameday_designer` frontend app.

**Architecture:** Most failures are test-side issues (wrong query selectors, stale mocks, incorrect mock shapes). Two failures require a small source-code fix in `ListDesignerApp.tsx`. All fixes are local to the gameday_designer directory.

**Tech Stack:** React 19, TypeScript, Vitest, @testing-library/react

---

## Root-Cause Summary

| # | Test | File | Root Cause |
|---|------|------|-----------|
| 1 | should render the main app container | `ListDesignerApp.test.tsx` | `getByText` finds 2 matches (accordion header + AppHeader page title) |
| 2–3 | handles publish success/failure | `ListDesignerApp-coverage.test.tsx` | Test expects a "Publish Now" confirm modal that doesn't exist |
| 4 | handles game result modal names and hide | `ListDesignerApp-coverage.test.tsx` | Mock sets `nodes` at top-level but component reads `flowState.nodes` from real `useFlowState()` |
| 5 | handles auto-save failure | `ListDesignerApp-coverage.test.tsx` | (a) `saveData` mock resolves (never fails); (b) auto-save catch only `console.error`—never calls `addNotification` |
| 6 | verifies the structure is rendered correctly | `ListDesignerApp-e2e.test.tsx` | `getDesignerState` mocked as `null`; `loadData` never calls `getGameday`, so `designer_data` is ignored |
| 7 | verifies results entry mode toggle | `ListDesignerApp-e2e.test.tsx` | Same as #6 — metadata never loaded, so `results-mode-button` condition never satisfied |
| 8 | should show fields when they exist | `ListDesignerApp-integration.test.tsx` | Same top-level `nodes` issue as #4 |
| 9–10 | handleSaveResult success/failure | `FinalCoveragePolish.test.tsx` | Same top-level `nodes` issue |
| 11 | covers manual officials group addition | `PRFixCoverage.test.tsx` | `findByTestId` fails: two elements have `data-testid="add-officials-button"` (accordion + canvas) |
| 12 | RED: should clear existing structure | `AutoClearOnGenerate.test.tsx` | Same `getDesignerState: null` as #6 |
| 13 | should trigger edge creation | `TournamentProgression.integration.test.tsx` | Same `getDesignerState: null`; no teams loaded so no games generated |
| 14 | covers Structured Template Export | `FeatureRefinements.test.tsx` | Test searches `/Export as Template/i` but button renders `"Template (Structured)"` |
| 15 | covers HIDDEN Auto-Clear warning | `FeatureRefinements.test.tsx` | `getByText(/Generate Tournament/i)` finds 2 matches (AppHeader button + modal title) |

## Key Finding: `loadData` only uses `getDesignerState`

```ts
// useDesignerController.ts:48-59
const loadData = useCallback(async () => {
  const state = await gamedayApi.getDesignerState(parseInt(gamedayId));
  if (state && state.state_data) {
    flowStateRef.current?.importState(state.state_data);
  }
}, [gamedayId]);
```

`getGameday` is **never called** by `loadData`. Any test that puts data in `designer_data` of `getGameday` but mocks `getDesignerState: null` starts with empty flow state.

---

## Chunk 1: Source Fix — Auto-Save Notification

### Task 1: Add `addNotification` to auto-save catch block

**Files:**
- Modify: `gameday_designer/src/components/ListDesignerApp.tsx:208-221`

The auto-save effect catch block currently only logs. The test (`handles auto-save failure`) expects `addNotification('Failed to auto-save changes', 'warning', 'Auto-save')` to be called.

English i18n keys already exist:
- `t('ui:notification.autoSaveFailed')` → `"Failed to auto-save changes"`
- `t('ui:notification.title.autoSave')` → `"Auto-save"`

- [ ] **Step 1: Read the current auto-save effect**

File: `gameday_designer/src/components/ListDesignerApp.tsx`, lines 208–231

- [ ] **Step 2: Add notification call in catch block**

Change from:
```tsx
} catch (error) {
  console.error('Auto-save failed', error);
} finally {
```

To:
```tsx
} catch (error) {
  console.error('Auto-save failed', error);
  addNotification(t('ui:notification.autoSaveFailed'), 'warning', t('ui:notification.title.autoSave'));
} finally {
```

- [ ] **Step 3: Run only auto-save test to verify fix direction**

```bash
npm --prefix gameday_designer/ run test -- --test-name-pattern="handles auto-save failure"
```

Expected: Still fails (saveData mock resolves successfully; will fix in next step)

- [ ] **Step 4: Fix `saveData` mock in coverage test to actually reject**

File: `gameday_designer/src/components/__tests__/ListDesignerApp-coverage.test.tsx`

The mock has `saveData: vi.fn().mockResolvedValue(undefined)`. The auto-save test needs it to reject. Change in the `handles auto-save failure` test setup to use `vi.fn().mockRejectedValue(new Error('Save Error'))` for `saveData` within that specific test (override before the rerender steps).

Find the section in the test where `secondChange` is set up (around line 376):
```ts
const secondChange = {
  ...defaultMockReturn,
  metadata: { ...defaultMockReturn.metadata, name: 'Changed' },
  exportState: vi.fn().mockReturnValue({...}),
  handlers: {
    ...mockHandlers,
    saveData: vi.fn().mockRejectedValue(new Error('Save Error')),
  }
};
```

- [ ] **Step 5: Run the auto-save test**

```bash
npm --prefix gameday_designer/ run test -- --test-name-pattern="handles auto-save failure"
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add gameday_designer/src/components/ListDesignerApp.tsx \
        gameday_designer/src/components/__tests__/ListDesignerApp-coverage.test.tsx
git commit -m "fix: add addNotification in auto-save failure and fix auto-save test mock"
```

---

## Chunk 2: Fix Tests with Wrong Mock Shape (controller mock + nodes)

These tests mock `useDesignerController` but put `nodes/fields` at the top level of the mock return. The component reads those from `flowState.nodes` via `useFlowState()` (not mocked). Fix: also mock `useFlowState`.

### Task 2: Fix "handles game result modal" test

**Files:**
- Modify: `gameday_designer/src/components/__tests__/ListDesignerApp-coverage.test.tsx`

The test `handles game result modal names and hide` (line 276) mocks nodes at top level but the component uses `flowState.nodes`.

- [ ] **Step 1: Add `useFlowState` mock at top of `ListDesignerApp-coverage.test.tsx`**

After the existing `vi.mock('../../hooks/useDesignerController')` line, add:
```ts
vi.mock('../../hooks/useFlowState', () => ({
  useFlowState: vi.fn(),
}));
import { useFlowState } from '../../hooks/useFlowState';
```

- [ ] **Step 2: Set up a default `useFlowState` mock return in `beforeEach`**

In the `beforeEach` block, add:
```ts
(useFlowState as Mock).mockReturnValue({
  nodes: [],
  edges: [],
  fields: [],
  globalTeams: defaultMockReturn.globalTeams,
  globalTeamGroups: defaultMockReturn.globalTeamGroups,
  metadata: defaultMockReturn.metadata,
  exportState: vi.fn().mockReturnValue({ nodes: [], edges: [], fields: [], globalTeams: [], globalTeamGroups: [] }),
  importState: vi.fn(),
  addField: vi.fn(),
  addGameNode: vi.fn(),
  updateNode: vi.fn(),
  deleteNode: vi.fn(),
  updateMetadata: vi.fn(),
  addGlobalTeam: vi.fn(),
  updateGlobalTeam: vi.fn(),
  deleteGlobalTeam: vi.fn(),
  reorderGlobalTeam: vi.fn(),
  addGlobalTeamGroup: vi.fn(),
  updateGlobalTeamGroup: vi.fn(),
  deleteGlobalTeamGroup: vi.fn(),
  reorderGlobalTeamGroup: vi.fn(),
  addBulkFields: vi.fn(),
  addBulkNodes: vi.fn(),
  deleteField: vi.fn(),
  canUndo: false,
  canRedo: false,
  undo: vi.fn(),
  redo: vi.fn(),
});
```

- [ ] **Step 3: Override `useFlowState` in the "handles game result modal" test**

In the test at line 276, after setting up `useDesignerController` mock, also configure `useFlowState`:
```ts
(useFlowState as Mock).mockReturnValue({
  ...(useFlowState as Mock).getMockImplementation()?.() || {},
  nodes: [mockField, mockStage, mockGame],
  fields: [mockField],
  globalTeams: mockTeams,
  exportState: vi.fn().mockReturnValue({}),
});
```

> **Note:** The exact shape of `useFlowState` return can be determined by looking at `gameday_designer/src/hooks/useFlowState.ts`. Use only the fields the component actually reads.

- [ ] **Step 4: Run the game result modal test**

```bash
npm --prefix gameday_designer/ run test -- --test-name-pattern="handles game result modal"
```

Expected: PASS

### Task 3: Fix "should show fields when they exist" test

**Files:**
- Modify: `gameday_designer/src/components/__tests__/ListDesignerApp-integration.test.tsx`

- [ ] **Step 1: Add `useFlowState` mock (same pattern as Task 2)**

After existing `vi.mock('../../hooks/useDesignerController')`, add:
```ts
vi.mock('../../hooks/useFlowState', () => ({ useFlowState: vi.fn() }));
import { useFlowState } from '../../hooks/useFlowState';
```

- [ ] **Step 2: Add default `useFlowState` mock in `beforeEach`**

Same minimal mock as in Task 2.

- [ ] **Step 3: Override for the specific test**

In the test "should show fields when they exist", change the mock return to have `nodes` inside `useFlowState` instead of in `useDesignerController`:
```ts
(useFlowState as Mock).mockReturnValue({
  ...defaultFlowStateMock,
  nodes: [{ id: 'field1', type: 'field', data: { name: 'Field 1', order: 0 }, position: { x: 0, y: 0 } }],
  fields: [{ id: 'field1', name: 'Field 1', order: 0 }],
  exportState: vi.fn().mockReturnValue({}),
});
```

And remove `nodes: [...]` from the `useDesignerController` mock return in this test.

- [ ] **Step 4: Run the test**

```bash
npm --prefix gameday_designer/ run test -- --test-name-pattern="should show fields when they exist"
```

Expected: PASS

### Task 4: Fix "handleSaveResult success/failure" tests

**Files:**
- Modify: `gameday_designer/src/components/__tests__/FinalCoveragePolish.test.tsx`

- [ ] **Step 1: Add `useFlowState` mock**

```ts
vi.mock('../../hooks/useFlowState', () => ({ useFlowState: vi.fn() }));
import { useFlowState } from '../../hooks/useFlowState';
```

- [ ] **Step 2: Add default mock in `beforeEach`**

- [ ] **Step 3: Override in both handleSaveResult tests to have game nodes**

For both "success path" and "failure path" tests, after `vi.mocked(useDesignerController).mockReturnValue(...)`, add:
```ts
vi.mocked(useFlowState).mockReturnValue({
  ...minimalFlowStateMock,
  nodes: [mockField, mockStage, mockGame],
  fields: [mockField],
  exportState: vi.fn().mockReturnValue({}),
} as unknown as ReturnType<typeof useFlowState>);
```

- [ ] **Step 4: Run the tests**

```bash
npm --prefix gameday_designer/ run test -- --test-name-pattern="handleSaveResult"
```

Expected: Both PASS

- [ ] **Step 5: Commit all flowState mock fixes**

```bash
git add gameday_designer/src/components/__tests__/ListDesignerApp-coverage.test.tsx \
        gameday_designer/src/components/__tests__/ListDesignerApp-integration.test.tsx \
        gameday_designer/src/components/__tests__/FinalCoveragePolish.test.tsx
git commit -m "fix: mock useFlowState in tests that require rendered nodes"
```

---

## Chunk 3: Fix `getDesignerState` Mock for Integration Tests

Tests that use real hooks but mock `getDesignerState: null` leave flow state empty. The fix is to return the actual data through `getDesignerState`.

### Task 5: Fix ListDesignerApp-e2e tests

**Files:**
- Modify: `gameday_designer/src/components/__tests__/ListDesignerApp-e2e.test.tsx`

- [ ] **Step 1: Fix "verifies the structure is rendered correctly"**

In `beforeEach`, change:
```ts
getDesignerState: vi.fn().mockResolvedValue(null),
```
To:
```ts
getDesignerState: vi.fn().mockResolvedValue({ state_data: mockGameday.designer_data }),
```

- [ ] **Step 2: Fix "verifies results entry mode toggle"**

In that test, `getGameday` is overridden to return `{ ...mockGameday, status: 'PUBLISHED' }`. The metadata status must also come through `getDesignerState`. Change the per-test `getGameday` mock to also set `getDesignerState`:
```ts
vi.mocked(gamedayApi.getDesignerState).mockResolvedValue({
  state_data: {
    ...mockGameday.designer_data,
    metadata: { ...mockGameday, status: 'PUBLISHED' },
  }
});
```

Also verify that `FlowToolbar` renders the `results-mode-button` when `gamedayStatus !== 'DRAFT'`. Looking at `FlowToolbar.tsx:106`: `{gamedayStatus !== 'DRAFT' && onResultsMode && (…results-mode-button…)}`. Since `toolbarProps` is set by `ListDesignerApp` and includes `onResultsMode: resultsModeHandler`, this should render once data is loaded.

- [ ] **Step 3: Run e2e tests**

```bash
npm --prefix gameday_designer/ run test -- src/components/__tests__/ListDesignerApp-e2e.test.tsx
```

Expected: Both PASS

### Task 6: Fix AutoClearOnGenerate test

**Files:**
- Modify: `gameday_designer/src/components/__tests__/AutoClearOnGenerate.test.tsx`

- [ ] **Step 1: Change `getDesignerState` mock to return the data**

In `beforeEach`, change:
```ts
vi.mocked(gamedayApi.getDesignerState).mockResolvedValue(null);
```
To:
```ts
vi.mocked(gamedayApi.getDesignerState).mockResolvedValue({
  state_data: mockGameday.designer_data as unknown as import('../../types/flowchart').FlowState,
});
```

- [ ] **Step 2: Verify the confirm button testid**

The test looks for `data-testid="confirm-generate-button"`. Check `TournamentGeneratorModal` to ensure this testid exists.

Run:
```bash
grep -n "confirm-generate-button" gameday_designer/src/components/modals/TournamentGeneratorModal.tsx
```

If missing, add `data-testid="confirm-generate-button"` to the generate button in that modal.

- [ ] **Step 3: Run the test**

```bash
npm --prefix gameday_designer/ run test -- src/components/__tests__/AutoClearOnGenerate.test.tsx
```

Expected: PASS

### Task 7: Fix TournamentProgression test

**Files:**
- Modify: `gameday_designer/src/components/__tests__/TournamentProgression.integration.test.tsx`

- [ ] **Step 1: Change `getDesignerState` mock in `beforeEach`**

Change:
```ts
getDesignerState: vi.fn().mockResolvedValue(null),
```
To:
```ts
getDesignerState: vi.fn().mockResolvedValue({
  state_data: {
    nodes: [],
    edges: [],
    fields: [],
    globalTeams: mockGameday.designer_data.globalTeams,
    globalTeamGroups: mockGameday.designer_data.globalTeamGroups,
  }
}),
```

- [ ] **Step 2: Verify `tr[id^="game-"]` rendering**

Check `ListCanvas` or its children to see if game rows render as `<tr id="game-...">` elements. Run the test and inspect the rendered HTML if it still fails.

- [ ] **Step 3: Run the test**

```bash
npm --prefix gameday_designer/ run test -- src/components/__tests__/TournamentProgression.integration.test.tsx
```

Expected: PASS (6 teams generate multiple games)

- [ ] **Step 4: Commit integration test fixes**

```bash
git add gameday_designer/src/components/__tests__/ListDesignerApp-e2e.test.tsx \
        gameday_designer/src/components/__tests__/AutoClearOnGenerate.test.tsx \
        gameday_designer/src/components/__tests__/TournamentProgression.integration.test.tsx
git commit -m "fix: provide designer state data via getDesignerState mock in integration tests"
```

---

## Chunk 4: Fix Selector/Query Issues

### Task 8: Fix "should render the main app container" — multiple text matches

**Files:**
- Modify: `gameday_designer/src/components/__tests__/ListDesignerApp.test.tsx`

**Error:** `Found multiple elements with the text: Test Gameday` — appears in both the accordion header button AND the AppHeader's page title (set via `setGamedayName` context).

- [ ] **Step 1: Change the assertion to use a specific selector**

Change line 144:
```ts
expect(screen.getByText('Test Gameday')).toBeInTheDocument();
```
To:
```ts
expect(screen.getAllByText('Test Gameday').length).toBeGreaterThan(0);
```
Or more specifically target the accordion:
```ts
expect(screen.getByTestId('gameday-metadata-accordion')).toBeInTheDocument();
```

- [ ] **Step 2: Run the test**

```bash
npm --prefix gameday_designer/ run test -- --test-name-pattern="should render the main app container"
```

Expected: PASS

### Task 9: Fix "handles publish success/failure" — missing confirmation modal

**Files:**
- Modify: `gameday_designer/src/components/__tests__/ListDesignerApp-coverage.test.tsx`

**Error:** `Unable to find an accessible element with the role "button" and name "/publish now/i"` — the implementation directly publishes without a confirmation step.

- [ ] **Step 1: Update "handles publish success" test (line 188)**

Remove the confirmation modal interaction. The test should:
1. Click `publish-schedule-button`
2. Wait for `gamedayApi.publish` to be called

Change the test body to:
```ts
it('handles publish success', async () => {
  (gamedayApi.publish as Mock).mockResolvedValue({ ...defaultMockReturn.metadata, status: 'PUBLISHED' });

  await renderApp();

  const publishBtn = screen.getByTestId('publish-schedule-button');
  fireEvent.click(publishBtn);

  await waitFor(() => {
    expect(gamedayApi.publish).toHaveBeenCalledWith(1);
    expect(mockHandlers.addNotification).toHaveBeenCalledWith(
      expect.stringContaining('published and locked'),
      'success',
      'Success'
    );
  });
});
```

> Note: Check the actual notification message key. The component calls `t('ui:notification.publishSuccess')`. Find what that translates to in English and update the `stringContaining` matcher.

- [ ] **Step 2: Update "handles publish failure" test (line 233)**

Similarly, remove the confirmation modal interaction:
```ts
it('handles publish failure', async () => {
  (gamedayApi.publish as Mock).mockRejectedValue(new Error('Publish Error'));

  await renderApp();

  const publishBtn = screen.getByTestId('publish-schedule-button');
  fireEvent.click(publishBtn);

  await waitFor(() => {
    expect(mockHandlers.addNotification).toHaveBeenCalledWith(
      expect.stringContaining('Failed to publish'),
      'danger',
      'Error'
    );
  });
});
```

> Check: In `ListDesignerApp.tsx`, onPublish catch calls `t('ui:notification.publishFailed')`. Find the English translation and update `stringContaining` accordingly.

- [ ] **Step 3: Check actual translation keys**

```bash
python3 -c "
import json
with open('gameday_designer/src/i18n/locales/en/ui.json') as f:
    d = json.load(f)
n = d.get('notification', {})
print('publishSuccess:', n.get('publishSuccess'))
print('publishFailed:', n.get('publishFailed'))
"
```

Update `stringContaining` matchers to match actual translation values.

- [ ] **Step 4: Run publish tests**

```bash
npm --prefix gameday_designer/ run test -- --test-name-pattern="handles publish"
```

Expected: Both PASS

### Task 10: Fix "covers manual officials group addition" — duplicate testid

**Files:**
- Modify: `gameday_designer/src/components/__tests__/PRFixCoverage.test.tsx`

**Error:** `Found multiple elements by: [data-testid="add-officials-button"]`

- [ ] **Step 1: Change `findByTestId` to `findAllByTestId`**

Change line 143:
```ts
const addOfficialsBtn = await screen.findByTestId('add-officials-button');
await userEvent.click(addOfficialsBtn);
```
To:
```ts
const addOfficialsBtns = await screen.findAllByTestId('add-officials-button');
await userEvent.click(addOfficialsBtns[0]);
```

- [ ] **Step 2: Run the test**

```bash
npm --prefix gameday_designer/ run test -- --test-name-pattern="covers manual officials group addition"
```

Expected: PASS

### Task 11: Fix "covers Structured Template Export" — wrong button text

**Files:**
- Modify: `gameday_designer/src/components/__tests__/FeatureRefinements.test.tsx`

**Error:** `Unable to find an element with the text: /Export as Template/i`

The FlowToolbar renders `{t('ui:button.exportTemplate')}` which translates to `"Template (Structured)"`.

- [ ] **Step 1: Change the search text**

Change line 146:
```ts
const exportTemplateBtn = await screen.findByText(/Export as Template/i);
```
To:
```ts
const exportTemplateBtn = await screen.findByText(/Template \(Structured\)/i);
```
Or using the testid:
```ts
const exportTemplateBtn = await screen.findByTestId('export-template-button');
```

- [ ] **Step 2: Run the test**

```bash
npm --prefix gameday_designer/ run test -- --test-name-pattern="Structured Template Export"
```

Expected: PASS (assuming the export dropdown opens correctly)

### Task 12: Fix "covers HIDDEN Auto-Clear warning" — multiple text matches

**Files:**
- Modify: `gameday_designer/src/components/__tests__/FeatureRefinements.test.tsx`

**Error:** `Found multiple elements with the text: /Generate Tournament/i` — appears in both the AppHeader `generate-tournament-button` and in the modal dialog title.

- [ ] **Step 1: Be more specific about which element to query**

Change lines 162–164:
```ts
await waitFor(() => {
  expect(screen.getByText(/Generate Tournament/i)).toBeInTheDocument();
}, { timeout: 10000 });
```
To:
```ts
await waitFor(() => {
  const modal = screen.getByRole('dialog');
  expect(modal).toBeInTheDocument();
}, { timeout: 10000 });
```

Or scope to the dialog:
```ts
await waitFor(() => {
  const dialogs = screen.getAllByText(/Generate Tournament/i);
  expect(dialogs.length).toBeGreaterThan(0);
}, { timeout: 10000 });
```

- [ ] **Step 2: Run the test**

```bash
npm --prefix gameday_designer/ run test -- --test-name-pattern="HIDDEN.*Auto-Clear"
```

Expected: PASS

- [ ] **Step 3: Commit selector fixes**

```bash
git add gameday_designer/src/components/__tests__/ListDesignerApp.test.tsx \
        gameday_designer/src/components/__tests__/ListDesignerApp-coverage.test.tsx \
        gameday_designer/src/components/__tests__/PRFixCoverage.test.tsx \
        gameday_designer/src/components/__tests__/FeatureRefinements.test.tsx
git commit -m "fix: correct test selectors for duplicate text and changed UI labels"
```

---

## Chunk 5: Final Verification

### Task 13: Run full test suite and verify all 15 tests pass

- [ ] **Step 1: Run all gameday_designer tests**

```bash
npm --prefix gameday_designer/ run test 2>&1 | tail -10
```

Expected output:
```
Test Files  X failed | 96 passed (96)
Tests       X failed | 1180 passed (1180)
```
Where X is 0.

- [ ] **Step 2: If any tests still fail, investigate the specific failure**

For each remaining failure:
1. Run the specific test with `--reporter=verbose` to see the exact error
2. Apply the minimal fix to match actual component behavior
3. Re-run to verify

- [ ] **Step 3: Final commit (if any late fixes)**

```bash
git add gameday_designer/src/components/__tests__/
git commit -m "fix: resolve remaining test failures in gameday_designer"
```

---

## Notes for Implementors

### How to mock `useFlowState` minimally

Read `gameday_designer/src/hooks/useFlowState.ts` to get the full return type. The component only reads these fields directly:

```ts
flowState.nodes        // passed to ListCanvas
flowState.edges        // passed to ListCanvas
flowState.globalTeams  // passed to ListCanvas and TournamentGeneratorModal
flowState.globalTeamGroups  // passed to ListCanvas
flowState.exportState()  // called for auto-save
```

Mock only those — use `vi.fn()` for the rest.

### Publish notification translation keys

Check actual values before writing tests:
```bash
python3 -c "
import json
with open('gameday_designer/src/i18n/locales/en/ui.json') as f:
    d = json.load(f)
n = d.get('notification', {})
for k in ['publishSuccess', 'publishFailed', 'unlockSuccess', 'unlockFailed']:
    print(f'{k}: {n.get(k)}')"
```

### `stats` property in coverage test mock

The `defaultMockReturn` in `ListDesignerApp-coverage.test.tsx` is missing `stats`, `canUndo`, `canRedo`, `undo`, `redo`. These come from the component's destructure of `useDesignerController`. They pass through to `setToolbarProps`. Add them to the mock:
```ts
canUndo: false,
canRedo: false,
undo: vi.fn(),
redo: vi.fn(),
stats: { gameCount: 0, teamCount: 0, fieldCount: 0 },
```
This may not be required for the failing tests but prevents act() warnings.
