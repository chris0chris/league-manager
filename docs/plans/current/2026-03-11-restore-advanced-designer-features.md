# Designer UI and Visual State Re-introduction Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore advanced UI components, specialized API views, and the `GamedayDesignerState` persistence layer to complete the Gameday Designer v2 ecosystem.

**Architecture:** 
- **Persistence**: Move visual state (nodes/edges) from `Gameday.designer_data` (deprecated) to a dedicated `GamedayDesignerState` model.
- **API**: Implement specialized endpoints for publishing and state management to improve atomicity.
- **UI**: Restore the "Actions" toolbar, toast notifications, and "Results Mode" toggle for a modern UX.

**Tech Stack:** Django 5.2 (Backend), React 19 / React-Bootstrap (Frontend).

---

### Task 1: Re-introduce GamedayDesignerState Model

**Files:**
- Modify: `gamedays/models.py`
- Create: `gamedays/migrations/0030_gamedaydesignerstate.py` (or let Django generate)
- Test: `gamedays/tests/test_designer_state.py`

**Step 1: Write the failing test**
Verify that a `GamedayDesignerState` can be created and linked to a `Gameday`.

**Step 2: Restore the model**
```python
class GamedayDesignerState(models.Model):
    gameday = models.OneToOneField(Gameday, on_delete=models.CASCADE, related_name="designer_state", primary_key=True)
    state_data = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)
    last_modified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
```

**Step 3: Run migrations and verify**
`python manage.py makemigrations gamedays && python manage.py migrate`

**Step 4: Commit**
`git add gamedays/models.py gamedays/migrations/`
`git commit -m "feat: re-introduce GamedayDesignerState model"`

---

### Task 2: Restore Specialized API Views

**Files:**
- Modify: `gamedays/api/views.py`
- Modify: `gamedays/api/urls.py`
- Test: `gamedays/api/tests/test_designer_api.py`

**Step 1: Restore GamedayPublishAPIView**
This view should handle the transition from DRAFT to PUBLISHED and trigger the initial `TemplateApplicationService`.

**Step 2: Restore DesignerState API**
Endpoints for GET/PUT of the visual state JSON.

**Step 3: Update URL routing**
Wire up `/api/gameday/<id>/publish/` and `/api/gameday/<id>/designer-state/`.

**Step 4: Commit**
`git commit -m "feat: restore specialized API views for publishing and designer state"`

---

### Task 3: Port Advanced UI Components (Frontend)

**Files:**
- Create: `gameday_designer/src/components/ui/LoadingOverlay.tsx`
- Create: `gameday_designer/src/components/ui/NotificationToast.tsx`
- Create: \`gameday_designer/src/components/FlowToolbar.tsx\`
- Modify: `gameday_designer/src/components/ListDesignerApp.tsx`

**Step 1: Restore the UI Directory**
`mkdir -p gameday_designer/src/components/ui`

**Step 2: Port Components from Chris's branch**
Extract and restore the source code for `FlowToolbar`, `LoadingOverlay`, and `NotificationToast`.

**Step 3: Integrate into ListDesignerApp**
Replace the basic header with `FlowToolbar` and add the toast/overlay layers.

**Step 4: Commit**
`git commit -m "feat: port advanced UI components to Gameday Designer"`

---

### Task 4: Integrate Results Mode and Dynamic Actions

**Files:**
- Modify: `gameday_designer/src/context/GamedayContext.tsx`
- Modify: `gameday_designer/src/components/ListDesignerApp.tsx`

**Step 1: Context State**
Add `resultsMode`, `setResultsMode`, and `gameResults` state to the Context API.

**Step 2: View Switching**
Update `ListDesignerApp` to render `GameResultsTable` when `resultsMode` is active.

**Step 3: API Synchronization**
Ensure "Save Results" in the Designer UI correctly updates the backend and triggers the progression signals.

**Step 4: Commit**
`git commit -m "feat: integrate Results Mode and dynamic actions into Designer UI"`
