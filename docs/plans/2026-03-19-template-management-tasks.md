# Gameday Template Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to save their current, validated gameday configurations as reusable, shareable templates.

**Architecture:** 
- **Backend**: Enhance `ScheduleTemplate` with a `sharing` choice field and implement an atomic `TemplateCreationService`.
- **Frontend**: Create `templateMapper.ts` to convert visual state to generic template data.
- **UI**: Add a "Save as Template" dialog inside the `TournamentGeneratorModal`.

**Tech Stack:** Django 5.2, React 19, TypeScript.

---

### Task 1: Backend Model & API Enhancements

**Files:**
- Modify: `gameday_designer/models.py`
- Modify: `gameday_designer/views.py`
- Modify: `gameday_designer/serializers.py`
- Test: `gameday_designer/tests/test_template_sharing.py`

**Step 1: Write the failing test**
Verify that `get_queryset` only returns appropriate templates based on `sharing` and `association`.

**Step 2: Add sharing field to ScheduleTemplate**
```python
SHARING_CHOICES = [('PRIVATE', 'Private'), ('ASSOCIATION', 'Association'), ('GLOBAL', 'Global')]
sharing = models.CharField(max_length=20, choices=SHARING_CHOICES, default='ASSOCIATION')
```

**Step 3: Update ViewSet filtering**
Update `ScheduleTemplateViewSet.get_queryset` to handle the union of shared templates.

**Step 4: Commit**
`git commit -m "feat: add sharing field and filtering to ScheduleTemplate"`

---

### Task 2: Template Creation Service

**Files:**
- Create: `gameday_designer/service/template_creation_service.py`
- Test: `gameday_designer/tests/test_template_creation_service.py`

**Step 1: Write the failing test**
Verify that a complex gameday structure (with update rules) can be saved as a template.

**Step 2: Implement TemplateCreationService**
Create an atomic service that creates `ScheduleTemplate`, `TemplateSlot`, and `TemplateUpdateRule` records from a nested dictionary.

**Step 3: Commit**
`git commit -m "feat: implement atomic TemplateCreationService"`

---

### Task 3: Frontend Template Mapper

**Files:**
- Create: `gameday_designer/src/utils/templateMapper.ts`
- Test: `gameday_designer/src/utils/__tests__/templateMapper.test.ts`

**Step 1: Write the failing test**
Verify that a `FlowState` with specific teams is correctly "genericized" into group/team indices.

**Step 2: Implement mapper logic**
Implement the conversion logic from nodes/edges to template slots and update rules.

**Step 3: Commit**
`git commit -m "feat: add templateMapper utility for genericizing structures"`

---

### Task 4: UI Integration

**Files:**
- Create: `gameday_designer/src/components/modals/SaveTemplateModal.tsx`
- Modify: `gameday_designer/src/components/modals/TournamentGeneratorModal.tsx`
- Modify: `gameday_designer/src/hooks/useDesignerController.ts`

**Step 1: Create SaveTemplateModal**
A dialog to capture Name, Description, and Sharing Level.

**Step 2: Integrate into TournamentGeneratorModal**
Add the "Save Current as Template" button, visible only when `validation.isValid` is true.

**Step 3: API Glue**
Add `saveTemplate` method to `gamedayApi.ts` and wire it to the "Save" button.

**Step 4: Commit**
`git commit -m "feat: add SaveTemplateModal and integrate into generator workflow"`
