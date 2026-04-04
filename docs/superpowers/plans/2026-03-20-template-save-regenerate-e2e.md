# Template Save and Regenerate E2E Test — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write a single integration test that exercises the full template lifecycle: generate from a built-in template, save the config as a custom template, clear the schedule, then regenerate from the saved custom template.

**Architecture:** One new test file renders `ListDesignerApp` with real hooks (useFlowState, useDesignerController), mocking only `gamedayApi.*`. Three source components need `data-testid` attributes added so the test can find elements reliably without brittle text/class queries.

**Tech Stack:** React 19, TypeScript, Vitest, @testing-library/react, userEvent v14

---

## File Structure

| Action | File | Change |
|--------|------|--------|
| Modify | `gameday_designer/src/components/modals/TournamentGeneratorModal.tsx` | Add testids to save-as-template button and template cards |
| Modify | `gameday_designer/src/components/modals/SaveTemplateModal.tsx` | Add testids to name input and save button |
| Create | `gameday_designer/src/components/__tests__/TemplateSaveAndRegenerate.integration.test.tsx` | New test file |

---

## Task 1: Add testids to TournamentGeneratorModal

**Files:**
- Modify: `gameday_designer/src/components/modals/TournamentGeneratorModal.tsx`

- [ ] **Step 1: Add testid to the "Save as Template" button (line ~230)**

Find this code:
```tsx
<Button
  variant="outline-primary"
  size="sm"
  onClick={() => setShowSaveModal(true)}
  disabled={!isValid}
>
```

Change to:
```tsx
<Button
  variant="outline-primary"
  size="sm"
  onClick={() => setShowSaveModal(true)}
  disabled={!isValid}
  data-testid="save-as-template-button"
>
```

- [ ] **Step 2: Add testid to built-in template cards (line ~250)**

Find this code:
```tsx
{builtInTemplates.map((template) => (
  <Col key={template.id} md={6}>
    <Card
      className={`h-100 cursor-pointer border-2 transition-all ${...}`}
      onClick={() => { ... }}
    >
```

Change the `<Card` opening to:
```tsx
    <Card
      className={`h-100 cursor-pointer border-2 transition-all ${...}`}
      onClick={() => { ... }}
      data-testid={`builtin-template-${template.id}`}
    >
```

- [ ] **Step 3: Add testid to custom template cards (line ~290)**

Find this code:
```tsx
{customTemplates.map((template) => (
  <Col key={template.id} md={6}>
    <Card
      className={`h-100 cursor-pointer border-2 transition-all ${...}`}
      onClick={() => { ... }}
    >
```

Change the `<Card` opening to:
```tsx
    <Card
      className={`h-100 cursor-pointer border-2 transition-all ${...}`}
      onClick={() => { ... }}
      data-testid={`custom-template-${template.id}`}
    >
```

- [ ] **Step 4: Verify existing tests still pass**

```bash
npm --prefix gameday_designer/ run test:run -- TournamentGeneratorModal
```

Expected: all tests in that file pass.

---

## Task 2: Add testids to SaveTemplateModal

**Files:**
- Modify: `gameday_designer/src/components/modals/SaveTemplateModal.tsx`

- [ ] **Step 1: Read the file to locate exact lines**

Read `gameday_designer/src/components/modals/SaveTemplateModal.tsx` lines 45-95.

- [ ] **Step 2: Add testid to the template name input (~line 48)**

Find:
```tsx
<Form.Control
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder={t('ui:placeholder.templateName')}
  autoFocus
/>
```

Change to:
```tsx
<Form.Control
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder={t('ui:placeholder.templateName')}
  autoFocus
  data-testid="template-name-input"
/>
```

- [ ] **Step 3: Add testid to the save button (~line 88)**

Find:
```tsx
<Button variant="primary" onClick={handleSave} disabled={loading}>
```

Change to:
```tsx
<Button variant="primary" onClick={handleSave} disabled={loading} data-testid="save-template-submit-button">
```

- [ ] **Step 4: Run tests to verify no regression**

```bash
npm --prefix gameday_designer/ run test:run 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 5: Commit the testid additions**

```bash
git add gameday_designer/src/components/modals/TournamentGeneratorModal.tsx \
        gameday_designer/src/components/modals/SaveTemplateModal.tsx
git commit -m "test: add data-testid attributes to support e2e template lifecycle test"
```

---

## Task 3: Write the test file

**Files:**
- Create: `gameday_designer/src/components/__tests__/TemplateSaveAndRegenerate.integration.test.tsx`

- [ ] **Step 1: Create the file with imports, mocks, and fixtures**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { gamedayApi } from '../../api/gamedayApi';
import ListDesignerApp from '../ListDesignerApp';
import AppHeader from '../layout/AppHeader';
import { GamedayProvider } from '../../context/GamedayContext';
import '../../testConfig';

// ── Router mock ──────────────────────────────────────────────────────────────
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => vi.fn(),
  };
});

// ── API mock ─────────────────────────────────────────────────────────────────
vi.mock('../../api/gamedayApi', () => ({
  gamedayApi: {
    getGameday: vi.fn(),
    publish: vi.fn(),
    patchGameday: vi.fn(),
    deleteGameday: vi.fn(),
    updateGameResult: vi.fn(),
    getGamedayGames: vi.fn().mockResolvedValue([]),
    updateBulkGameResults: vi.fn().mockResolvedValue({}),
    listSeasons: vi.fn().mockResolvedValue([]),
    listLeagues: vi.fn().mockResolvedValue([]),
    getDesignerState: vi.fn(),
    updateDesignerState: vi.fn().mockResolvedValue({}),
    getTemplates: vi.fn(),
    saveTemplate: vi.fn(),
  },
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockGameday = {
  id: 1,
  name: 'E2E Test Gameday',
  date: '2026-06-01',
  start: '10:00',
  format: '6_2',
  author: 1,
  address: 'Test Field',
  season: 1,
  league: 1,
  status: 'DRAFT',
  designer_data: { nodes: [], edges: [], fields: [], globalTeams: [], globalTeamGroups: [] },
};

/**
 * Initial designer state: one field + one stage + two games.
 * Must satisfy validation.isValid = true so the "Save as Template" button is enabled.
 * Node shapes follow src/types/flowchart.ts. If the button stays disabled, inspect
 * the validation service to see what conditions make isValid=true.
 */
const initialDesignerState = {
  nodes: [
    {
      id: 'field-1',
      type: 'field',
      data: { name: 'Field 1', order: 0 },
      position: { x: 0, y: 0 },
    },
    {
      id: 'stage-1',
      type: 'stage',
      parentId: 'field-1',
      data: { name: 'Vorrunde', category: 'preliminary', order: 0, stageType: 'STANDARD' },
      position: { x: 0, y: 0 },
    },
    {
      id: 'game-1',
      type: 'game',
      parentId: 'stage-1',
      data: { standing: 'G1', order: 0 },
      position: { x: 0, y: 0 },
    },
    {
      id: 'game-2',
      type: 'game',
      parentId: 'stage-1',
      data: { standing: 'G2', order: 1 },
      position: { x: 0, y: 0 },
    },
  ],
  edges: [],
  fields: [{ id: 'field-1', name: 'Field 1', order: 0 }],
  globalTeams: [],
  globalTeamGroups: [],
};

/** Returned by getTemplates on the second modal open, after save. */
const savedCustomTemplate = {
  id: 99,
  name: 'My Custom Template',
  num_teams: 6,
  num_fields: 1,
  description: '',
  sharing: 'PRIVATE',
  association: null,
};
```

- [ ] **Step 2: Add describe block, beforeEach, and renderApp helper**

```typescript
describe('Template save-and-regenerate lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gamedayApi.getGameday).mockResolvedValue({ ...mockGameday });
    vi.mocked(gamedayApi.getGamedayGames).mockResolvedValue([]);
    vi.mocked(gamedayApi.getDesignerState).mockResolvedValue({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state_data: initialDesignerState as any,
    });
    vi.mocked(gamedayApi.saveTemplate).mockResolvedValue(savedCustomTemplate);
    // First modal open → no custom templates yet
    // Second modal open (after save) → saved template appears
    vi.mocked(gamedayApi.getTemplates)
      .mockResolvedValueOnce([])
      .mockResolvedValue([savedCustomTemplate]);
  });

  async function renderApp() {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/designer/1']}>
        <GamedayProvider>
          <AppHeader />
          <Routes>
            <Route path="/designer/:id" element={<ListDesignerApp />} />
          </Routes>
        </GamedayProvider>
      </MemoryRouter>
    );
    await waitFor(
      () => expect(screen.queryByRole('status')).not.toBeInTheDocument(),
      { timeout: 15000 }
    );
    return { user };
  }
```

- [ ] **Step 3: Write the test body**

```typescript
  it('generates from built-in template, saves as custom, clears, regenerates from custom', async () => {
    const { user } = await renderApp();

    // ── 1. Open generator modal ───────────────────────────────────────────────
    await user.click(screen.getByTestId('generate-tournament-button'));
    const modal = await screen.findByRole('dialog');

    // ── 2. Save current config as custom template ─────────────────────────────
    // Button is disabled={!isValid}; initial state must have nodes (see fixture above)
    const saveAsBtn = within(modal).getByTestId('save-as-template-button');
    await user.click(saveAsBtn);

    // SaveTemplateModal opens — now two dialogs are visible
    await waitFor(() => expect(screen.getAllByRole('dialog').length).toBeGreaterThanOrEqual(2));

    // Type template name.
    // SaveTemplateModal's Form.Group has no controlId so getByLabelText won't work.
    // Use data-testid="template-name-input" added in Task 2.
    const nameInput = screen.getByTestId('template-name-input');
    await user.clear(nameInput);
    await user.type(nameInput, 'My Custom Template');

    // Click save in SaveTemplateModal (data-testid="save-template-submit-button")
    await user.click(screen.getByTestId('save-template-submit-button'));

    // Verify API called with template name
    await waitFor(() => {
      expect(gamedayApi.saveTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Custom Template' })
      );
    });

    // SaveTemplateModal closes — back to one dialog
    await waitFor(() => expect(screen.getAllByRole('dialog').length).toBe(1));

    // ── 3. Select built-in template and generate ──────────────────────────────
    // Built-in template IDs come from tournamentTemplates.ts: 'F6-2-2', 'F8-2-3', etc.
    // Click the first one.
    await user.click(screen.getByTestId('builtin-template-F6-2-2'));

    // Select "Generate teams automatically" (type="radio")
    // i18n key: ui:label.generatePlaceholders → EN: "Generate teams automatically"
    // No real teams in test data, so this radio must be selected for canGenerate=true.
    await user.click(screen.getByRole('radio', { name: /generate teams automatically/i }));

    const saveCallsBefore = vi.mocked(gamedayApi.updateDesignerState).mock.calls.length;
    await user.click(screen.getByTestId('confirm-generate-button'));

    // Modal closes after generation
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Auto-save fires after generation
    await waitFor(() => {
      expect(vi.mocked(gamedayApi.updateDesignerState).mock.calls.length).toBeGreaterThan(saveCallsBefore);
    });

    // ── 4. Clear the schedule ─────────────────────────────────────────────────
    // Open GamedayMetadataAccordion
    await user.click(screen.getByTestId('gameday-metadata-toggle'));
    await waitFor(() => expect(screen.getByTestId('clear-all-button')).toBeVisible());

    const clearCallsBefore = vi.mocked(gamedayApi.updateDesignerState).mock.calls.length;
    await user.click(screen.getByTestId('clear-all-button'));
    // No confirmation modal — clear-all is a direct call to flowState.clearAll()

    // Auto-save fires after clear
    await waitFor(() => {
      expect(vi.mocked(gamedayApi.updateDesignerState).mock.calls.length).toBeGreaterThan(clearCallsBefore);
    });

    // ── 5. Reopen generator, pick custom template, regenerate ─────────────────
    await user.click(screen.getByTestId('generate-tournament-button'));
    await screen.findByRole('dialog');

    // getTemplates is called again on modal open → returns [savedCustomTemplate] this time
    // Custom template card should appear
    await waitFor(() => {
      expect(screen.getByTestId('custom-template-99')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('custom-template-99'));

    // Select "Generate teams automatically" again (form resets on each modal open)
    await user.click(screen.getByRole('radio', { name: /generate teams automatically/i }));

    const regenCallsBefore = vi.mocked(gamedayApi.updateDesignerState).mock.calls.length;
    await user.click(screen.getByTestId('confirm-generate-button'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Auto-save fires after second generation
    await waitFor(() => {
      expect(vi.mocked(gamedayApi.updateDesignerState).mock.calls.length).toBeGreaterThan(regenCallsBefore);
    });
  });
});
```

- [ ] **Step 4: Run the new test**

```bash
npm --prefix gameday_designer/ run test:run -- --reporter=verbose TemplateSaveAndRegenerate
```

Expected: 1 test, passes. If it fails:
- **"save-as-template-button not found"** → testid not added in Task 1, or `isValid=false` so button not rendered — check validation logic
- **"builtin-template-F6-2-2 not found"** → wrong template ID; run `grep -n "id:" gameday_designer/src/utils/tournamentTemplates.ts` to find correct IDs
- **"radio not found"** → translation for `ui:label.generatePlaceholders` didn't resolve to "Generate teams automatically"; try `getByRole('radio', { name: /placeholder/i })` or check the EN translation value
- **"custom-template-99 not found"** → `getTemplates` mock not returning `savedCustomTemplate` on second call; check `mockResolvedValueOnce` is set in `beforeEach` before `render`

---

## Task 4: Run full suite and commit

**Files:**
- No additional changes

- [ ] **Step 1: Run the full gameday_designer test suite**

```bash
npm --prefix gameday_designer/ run test:run 2>&1 | tail -5
```

Expected:
```
Test Files  99 passed (99)
Tests       1203 passed (1203)
```

All previously passing tests still pass. New count is exactly +1 test file, +1 test.

- [ ] **Step 2: Commit**

```bash
git add gameday_designer/src/components/__tests__/TemplateSaveAndRegenerate.integration.test.tsx
git commit -m "test: add e2e integration test for template save and regenerate lifecycle"
```

- [ ] **Step 3: Push**

```bash
git push
```
