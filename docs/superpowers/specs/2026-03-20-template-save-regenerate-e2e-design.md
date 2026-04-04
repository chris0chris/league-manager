# E2E Test: Template Save and Regenerate Flow

**Date:** 2026-03-20
**Feature:** Gameday Designer — generate from built-in template, save as own, clear, regenerate from own

---

## Goal

A single integration test that exercises the complete template lifecycle in the Gameday Designer:
1. Open the tournament generator modal on a new gameday
2. Save the current schedule configuration as a custom template
3. Generate a schedule from a built-in template
4. Clear the schedule
5. Reopen the generator and regenerate from the saved custom template

This validates that the custom template is persisted, appears in the modal on subsequent opens, and can be used to regenerate a schedule — all within one continuous user flow.

---

## File

**New file:** `gameday_designer/src/components/__tests__/TemplateSaveAndRegenerate.integration.test.tsx`

---

## Setup

### Render Pattern

Matches the existing `ListDesignerApp-e2e.test.tsx` pattern:

```tsx
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
await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument(), { timeout: 15000 });
```

### Initial State

The gameday starts with existing nodes so that `validation.isValid = true` (required to enable the "Save as Template" button in `TournamentGeneratorModal`). The `isValid` prop is computed by the validation hook inside `ListDesignerApp` and passed to the modal — it requires at least one field with at least one game. The `getDesignerState` mock must return:

- 1 field node
- 1 stage node (child of field)
- 2 game nodes (children of stage, each with home/away team assignments)
- `status: 'DRAFT'`

### API Mocks

All mocks set up in `beforeEach` before render:

| API call | Return value | Notes |
|---|---|---|
| `gamedayApi.getGameday` | Gameday with DRAFT status | Standard fixture |
| `gamedayApi.getDesignerState` | State with field/stage/game nodes | Enables "Save as Template" button (`isValid=true`) |
| `gamedayApi.updateDesignerState` | Resolves `{}` | Auto-save triggered after generation and after clear |
| `gamedayApi.getTemplates` | Call 1: `[]`, Call 2: `[savedCustomTemplate]` | See note below |
| `gamedayApi.saveTemplate` | Returns `savedCustomTemplate` | The save-from-designer endpoint |
| `gamedayApi.listSeasons` | `[]` | Required by GamedayMetadataAccordion form |
| `gamedayApi.listLeagues` | `[]` | Required by GamedayMetadataAccordion form |

**`getTemplates` mock setup:** Use `mockResolvedValueOnce` + `mockResolvedValue` chained before render:
```ts
vi.mocked(gamedayApi.getTemplates)
  .mockResolvedValueOnce([])
  .mockResolvedValue([savedCustomTemplate]);
```
`TournamentGeneratorModal` calls `getTemplates` inside a `useEffect` on `show` becoming `true`. The modal opens twice in this test (Steps 2 and 19), so `getTemplates` is called exactly twice. Call 1 (first modal open) returns `[]`; call 2 (second modal open, after save) returns `[savedCustomTemplate]`.

---

## Test Steps

```
Step 1:  render app → waitFor loading spinner gone

Step 2:  click [data-testid="generate-tournament-button"]
Step 3:  waitFor modal to appear (role="dialog")

Step 4:  click button with text "Save as Template"
         (i18n key: ui:button.saveAsTemplate → EN: "Save as Template")
         Button has no data-testid; use getByRole('button', { name: /save as template/i })
         Button is only rendered when onSaveAsTemplate prop is provided AND
         is enabled only when isValid=true (validated by initial state fixture)

Step 5:  waitFor SaveTemplateModal sub-modal to appear
Step 6:  type "My Custom Template" into the template name input
         SaveTemplateModal's Form.Group has no controlId, so getByLabelText will NOT work.
         Use: getByPlaceholderText(/e\.g\., 6 teams/i)  (i18n: ui:placeholder.templateName)
         or:  getByRole('textbox')  (only textbox rendered in the sub-modal at this point)
Step 7:  click save/confirm button in SaveTemplateModal

Step 8:  ASSERT: gamedayApi.saveTemplate called with object containing name "My Custom Template"
Step 9:  waitFor SaveTemplateModal to close (back in generator modal)

Step 10: click first built-in template card (auto-selects it)

Step 11: click "Generate teams automatically" radio button
         (i18n key: ui:label.generatePlaceholders → EN: "Generate teams automatically")
         Control is type="radio" — use: getByRole('radio', { name: /generate teams automatically/i })
         This sets generateTeams=true, bypassing team-count validation
         (no teams exist in test data, so this is required for canGenerate=true)

Step 12: click [data-testid="confirm-generate-button"]
Step 13: waitFor modal to close (role="dialog" gone)

Step 14: ASSERT: gamedayApi.updateDesignerState called (auto-save after generation)

Step 15: click [data-testid="gameday-metadata-toggle"] to open accordion
Step 16: click [data-testid="clear-all-button"]
         (No confirmation dialog — clear-all is a direct call, no modal)

Step 17: ASSERT: gamedayApi.updateDesignerState called again (auto-save after clear)

Step 18: click [data-testid="generate-tournament-button"]
Step 19: waitFor modal to appear (role="dialog")
Step 20: waitFor text "My Custom Template" to appear in the modal
         (custom template card rendered in "Custom Templates" / "Eigene Vorlagen" section)

Step 21: click the card containing "My Custom Template"
Step 22: click [data-testid="confirm-generate-button"]
Step 23: waitFor modal to close

Step 24: ASSERT: gamedayApi.updateDesignerState called again (regeneration auto-save)
```

---

## Assertions Summary

| Step | Assertion |
|---|---|
| 8 | `gamedayApi.saveTemplate` called with `{ name: "My Custom Template", ... }` |
| 14 | `gamedayApi.updateDesignerState` called at least once after generation |
| 17 | `gamedayApi.updateDesignerState` call count increased after clear |
| 20 | Text "My Custom Template" visible inside `role="dialog"` |
| 24 | `gamedayApi.updateDesignerState` called again after regeneration |

---

## What This Test Does NOT Cover

- Server-side persistence (covered by `test_api.py`)
- Template sharing/visibility rules (covered by `test_template_sharing.py`)
- Error paths (save failure, generation failure)
- Publishing the gameday before regeneration

---

## Dependencies

- `@testing-library/user-event` for realistic click/type events
- `vitest` mocks for `gamedayApi`
- Existing `testConfig` for i18n setup (same as other tests in `__tests__/`)
- No new test utilities needed
