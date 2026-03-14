# Regression & Feature Analysis: v3.1.7 → v3.1.8-rc.3

Comparing gameday_designer UI/UX and backend behavior between the two tags.
Source: screenshots + `git diff v3.1.7 v3.1.8-rc.3` analysis on 2026-03-13.

**Status legend:** `[ ]` = pending · `[x]` = done · `[-]` = wont-fix / deferred
**Priority:** set by user before work begins.

---

## [x] UI-001 — Whitespace gap between LS navbar and designer navbar

| Field    | Value       |
|----------|-------------|
| Category | UI / Layout |
| Severity | Medium      |
| Priority | Done        |

**v3.1.7:** No gap — `sticky-top` metadata panel bridged the space between the two navbars.
**v3.1.8-rc.3:** Visible white gap — `<Container fluid className="px-4 mt-4">` adds 16px top margin, combined with
`mb-2` on the designer `<Navbar>`.
**Root cause:** `mt-4` added to wrapper; `ListDesignerApp.css` (which set `.navbar { z-index: 1025 }`) no longer
imported.
**Files:** `gameday_designer/src/components/ListDesignerApp.tsx`, `ListDesignerApp.css`

---

## [x] UI-002 — Adaptive button sizes broken (icon-only → full label always shown)

| Field    | Value       |
|----------|-------------|
| Category | UI / Layout |
| Severity | Medium      |
| Priority | Done        |

**v3.1.7:** Buttons collapsed to icon-only at smaller widths via `btn-adaptive` / `btn-label-adaptive` CSS classes.
**v3.1.8-rc.3:** Classes still referenced in JSX but `ListDesignerApp.css` is no longer imported — no styling applied,
buttons always show full text label.
**Root cause:** `ListDesignerApp.css` import removed from `ListDesignerApp.tsx`.
**Files:** `gameday_designer/src/components/ListDesignerApp.tsx`,
`gameday_designer/src/components/layout/AppHeader.tsx`, `ListDesignerApp.css`

---

## [x] UI-003 — Metadata section not height-constrained (expands freely)

| Field    | Value       |
|----------|-------------|
| Category | UI / Layout |
| Severity | Medium      |
| Priority | Done        |

**v3.1.7:** Metadata accordion was inside a scroll-bounded container (`h-100 d-flex flex-column overflow-auto`) —
content couldn't expand beyond viewport.
**v3.1.8-rc.3:** Root div uses `min-vh-100` — page scrolls freely, metadata accordion and all content expand without
limit.
**Root cause:** Layout architecture changed from scroll-bounded to full-page scroll.
**Files:** `gameday_designer/src/components/ListDesignerApp.tsx`

---

## [x] BEH-001 — Accordion starts CLOSED (was open by default)

| Field    | Value    |
|----------|----------|
| Category | Behavior |
| Severity | High     |
| Priority | Done     |

**v3.1.7:** `useState<string | null>('0')` controlled accordion — starts open on every load.
**v3.1.8-rc.3:** `<Accordion>` is uncontrolled with no `defaultActiveKey` — React-Bootstrap defaults to closed.
**Root cause:** Controlled `activeKey` state removed; no `defaultActiveKey` added.
**Files:** `gameday_designer/src/components/GamedayMetadataAccordion.tsx`

---

## [x] BEH-002 — Accordion auto-close on scroll removed

| Field    | Value    |
|----------|----------|
| Category | Behavior |
| Severity | Low      |
| Priority | Done     |

**v3.1.7:** `onScroll` handler collapsed the metadata accordion when scroll position exceeded 50px.
**v3.1.8-rc.3:** No scroll handler — accordion does not auto-collapse on scroll.
**Root cause:** Scroll handler not migrated to new layout.
**Files:** `gameday_designer/src/components/ListDesignerApp.tsx`

---

## [x] BEH-003 — Publish validation modal removed (no replacement)

| Field    | Value         |
|----------|---------------|
| Category | Behavior / UX |
| Severity | Medium        |
| Priority | Done          |

**v3.1.7:** `PublishConfirmationModal` displayed validation errors and warnings before confirming publish.
**v3.1.8-rc.3:** Modal is imported but unused — publish fires immediately with no pre-confirmation review step.
**Root cause:** Publish flow refactored; modal not re-integrated.
**Files:** `gameday_designer/src/components/ListDesignerApp.tsx`, `PublishConfirmationModal.tsx`

---

## [x] BEH-004 — Delete uses window.confirm with missing i18n key

| Field    | Value    |
|----------|----------|
| Category | Behavior |
| Severity | Medium   |
| Priority | Done     |

**v3.1.7:** Delete navigated with `{ state: { pendingDeleteId } }` — handled gracefully by dashboard.
**v3.1.8-rc.3:** `window.confirm(t('ui:message.confirmDeleteGameday'))` — the i18n key does not exist; raw key string
shown to user.
**Root cause:** i18n key `ui:message.confirmDeleteGameday` never added to translation files.
**Files:** `gameday_designer/src/components/ListDesignerApp.tsx`, `gameday_designer/src/i18n/ui.json`

---

## [x] BEH-005 — Auto-save debounce increased (1500ms → 2000ms)

| Field    | Value    |
|----------|----------|
| Category | Behavior |
| Severity | Low      |
| Priority | Done     |

**v3.1.7:** Auto-save triggered 1500ms after last change.
**v3.1.8-rc.3:** Auto-save triggered 2000ms after last change.
**Files:** `gameday_designer/src/hooks/useDesignerController.ts`

---

## BUG-001 — TeamSelectionModal receives incompatible props (team assignment broken)

| Field    | Value    |
|----------|----------|
| Category | Bug      |
| Severity | **High** |
| Priority | _TBD_    |

`ListDesignerApp` passes `teams`, `groups`, and `onSelect: (teamId: string) => void` to `TeamSelectionModal`.
The component interface does not accept `teams`/`groups` as props, and `onSelect` expects
`(team: { id: number; text: string }) => void`.
**Effect:** Team assignment from the selection modal does not work at all.
**Files:** `gameday_designer/src/components/ListDesignerApp.tsx`,
`gameday_designer/src/components/TeamSelectionModal.tsx`

---

## BUG-002 — Bulk result save sends wrong primary key to backend

| Field    | Value    |
|----------|----------|
| Category | Bug      |
| Severity | **High** |
| Priority | _TBD_    |

`updateGameResultDetail(resultId, ...)` passes `Gameresult.id` to an endpoint that expects `Gameinfo.id`.
**Effect:** Bulk game result saves update the wrong records or return 404.
**Files:** `gameday_designer/src/components/ListDesignerApp.tsx` (line ~631), `gameday_designer/src/api/gamedayApi.ts`

---

## BUG-003 — STATUS_COMPLETED value changed without data migration

| Field    | Value    |
|----------|----------|
| Category | Bug      |
| Severity | **High** |
| Priority | _TBD_    |

`Gameinfo.STATUS_COMPLETED` changed from `"Beendet"` (capital B) to `"beendet"` (lowercase).
No Django data migration exists for existing rows with `status = "Beendet"`.
**Effect:** Existing completed games no longer match `STATUS_COMPLETED` — schedule progression signals will not fire for
historical data.
**Files:** `gamedays/models.py` (line ~187)

---

## BUG-004 — NotificationToast prop name mismatch

| Field    | Value  |
|----------|--------|
| Category | Bug    |
| Severity | Medium |
| Priority | _TBD_  |

`ListDesignerApp` passes `onDismiss` prop; `NotificationToast` interface expects `onClose`.
**Effect:** Toast dismiss callback silently ignored — notifications may not close on user action.
**Files:** `gameday_designer/src/components/ListDesignerApp.tsx`,
`gameday_designer/src/components/ui/NotificationToast.tsx`

---

## BUG-005 — "Add Officials" i18n key resolves to missing path

| Field    | Value  |
|----------|--------|
| Category | Bug    |
| Severity | Medium |
| Priority | _TBD_  |

`t('domain:team.officials')` used as group name for the officials slot.
`domain.json` has `"team": "Team"` (a string), not an object with an `officials` sub-key.
**Effect:** Officials group is created with the raw key string `"domain:team.officials"` as its name.
**Files:** `gameday_designer/src/components/ListDesignerApp.tsx`, `gameday_designer/src/i18n/domain.json`

---

## BUG-006 — "Select Official" modal title i18n key missing

| Field    | Value  |
|----------|--------|
| Category | Bug    |
| Severity | Medium |
| Priority | _TBD_  |

`t('ui:title.selectOfficial')` used as `TeamSelectionModal` title when `side === 'official'`.
Key does not exist in `ui.json`.
**Effect:** Modal title shows raw key string.
**Files:** `gameday_designer/src/components/ListDesignerApp.tsx`, `gameday_designer/src/i18n/ui.json`

---

## BUG-007 — Several notification i18n keys missing

| Field    | Value |
|----------|-------|
| Category | Bug   |
| Severity | Low   |
| Priority | _TBD_ |

The following keys are used but absent from `ui.json`:

- `ui:notification.templateExported.title`
- `ui:notification.resultsSaved`
- `ui:notification.resultsSaveFailed`

**Effect:** Notification toasts show raw key strings instead of translated messages.
**Files:** `gameday_designer/src/components/ListDesignerApp.tsx`, `gameday_designer/src/i18n/ui.json`

---

## BUG-008 — getTeamUsage always returns empty (team usage tracking disabled)

| Field    | Value |
|----------|-------|
| Category | Bug   |
| Severity | Low   |
| Priority | _TBD_ |

`getTeamUsage` callback hardcoded to return `{ count: 0, games: [] }` — actual usage not computed.
**Effect:** UI cannot warn when a team is already assigned elsewhere.
**Files:** `gameday_designer/src/components/ListDesignerApp.tsx` (line ~871)

---

## FEAT-001 — "Add Officials" button in metadata accordion (new feature)

| Field    | Value       |
|----------|-------------|
| Category | New Feature |
| Severity | —           |
| Priority | _TBD_       |

New button in metadata accordion action bar to add an officials group to the schedule.
Currently broken due to BUG-005 and BUG-001.
**Files:** `gameday_designer/src/components/GamedayMetadataAccordion.tsx`, `ListDesignerApp.tsx`

---

## FEAT-002 — External official slot in TeamSelectionModal (new feature)

| Field    | Value       |
|----------|-------------|
| Category | New Feature |
| Severity | —           |
| Priority | _TBD_       |

`TeamSelectionModal` extended to support `side: 'official'` for assigning an official to a game slot.
Currently broken due to BUG-001 and BUG-006.
**Files:** `gameday_designer/src/components/ListDesignerApp.tsx`, `TeamSelectionModal.tsx`

---

## FEAT-003 — Dedicated GamedayDesignerState backend model (new feature)

| Field    | Value       |
|----------|-------------|
| Category | New Feature |
| Severity | —           |
| Priority | _TBD_       |

New `GamedayDesignerState` Django model (OneToOne with Gameday) replaces embedded `designer_data` field.
New API: `GET/PUT /api/gamedays/{id}/designer-state/`.
Requires migration 0030 to be applied.
**Files:** `gamedays/models.py`, `gamedays/migrations/0030_gamedaydesignerstate.py`, `gamedays/api/views.py`

---

## FEAT-004 — Dual-progression schedule resolution (new feature)

| Field    | Value       |
|----------|-------------|
| Category | New Feature |
| Severity | —           |
| Priority | _TBD_       |

When a game completes, signals now route to either the designer-based `GamedayScheduleResolutionService` or the legacy
`ScheduleUpdate` path based on whether a `TemplateApplication` exists.
**Files:** `gamedays/service/signals.py`, `gamedays/service/schedule_resolution_service.py`

---

## FEAT-005 — Placeholder resolution for unassigned bracket slots (new feature)

| Field    | Value       |
|----------|-------------|
| Category | New Feature |
| Severity | —           |
| Priority | _TBD_       |

`GamedayPlaceholderService` resolves human-readable names ("Winner Game 1") for unassigned bracket positions in schedule
views and the game log API.
**Files:** `gamedays/service/placeholder_service.py`, `gamedays/service/model_wrapper.py`, `gamedays/api/serializers.py`

---

## FEAT-006 — Full-screen LoadingOverlay component (new feature)

| Field    | Value       |
|----------|-------------|
| Category | New Feature |
| Severity | —           |
| Priority | _TBD_       |

Replaces inline spinner with a fixed-position, semi-transparent full-screen overlay (z-index 9999) during async
operations.
**Files:** `gameday_designer/src/components/ui/LoadingOverlay.tsx`

---

## Issue Index

| ID       | Title                                             | Category    | Severity | Status |
|----------|---------------------------------------------------|-------------|----------|--------|
| UI-001   | Whitespace gap between navbars                    | UI/Layout   | Medium   | [x]    |
| UI-002   | Adaptive button sizes broken                      | UI/Layout   | Medium   | [x]    |
| UI-003   | Metadata section not height-constrained           | UI/Layout   | Medium   | [x]    |
| BEH-001  | Accordion starts closed                           | Behavior    | High     | [x]    |
| BEH-002  | Accordion auto-close on scroll removed            | Behavior    | Low      | [x]    |
| BEH-003  | Publish validation modal removed                  | Behavior/UX | Medium   | [x]    |
| BEH-004  | Delete uses window.confirm with missing i18n      | Behavior    | Medium   | [x]    |
| BEH-005  | Auto-save debounce increased                      | Behavior    | Low      | [x]    |
| BUG-001  | TeamSelectionModal incompatible props             | Bug         | **High** |
| BUG-002  | Bulk result save sends wrong primary key          | Bug         | **High** |
| BUG-003  | STATUS_COMPLETED value changed, no data migration | Bug         | **High** |
| BUG-004  | NotificationToast prop name mismatch              | Bug         | Medium   |
| BUG-005  | "Add Officials" i18n key wrong path               | Bug         | Medium   |
| BUG-006  | "Select Official" modal title i18n key missing    | Bug         | Medium   |
| BUG-007  | Several notification i18n keys missing            | Bug         | Low      |
| BUG-008  | getTeamUsage always returns empty                 | Bug         | Low      |
| FEAT-001 | "Add Officials" button (broken)                   | New Feature | —        |
| FEAT-002 | External official slot (broken)                   | New Feature | —        |
| FEAT-003 | Dedicated GamedayDesignerState model              | New Feature | —        |
| FEAT-004 | Dual-progression schedule resolution              | New Feature | —        |
| FEAT-005 | Placeholder resolution for bracket slots          | New Feature | —        |
| FEAT-006 | Full-screen LoadingOverlay                        | New Feature | —        |
