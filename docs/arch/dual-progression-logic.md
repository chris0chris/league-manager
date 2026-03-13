# Design: Dual-Logic Tournament Progression

## Overview
This design re-introduces the advanced tournament progression logic required by the Gameday Designer while maintaining full backward compatibility for legacy gamedays that rely on JSON-based schedule files.

## Architecture
We will implement a switching mechanism in the `post_save` signal for `Gameinfo`.

### 1. Logic Selection Strategy
The system must decide which progression logic to use when a game finishes:
- **Designer Logic**: If the `Gameday` has an associated `TemplateApplication` (created when applying a DB template), use the new `GamedayScheduleResolutionService`.
- **Legacy Logic**: If no `TemplateApplication` exists, fallback to the current `ScheduleUpdate` (JSON-based).

### 2. Component: GamedayScheduleResolutionService
This service (to be restored from commit `813e9407`) will:
- Retrieve the `ScheduleTemplate` and its `TemplateUpdateRule` objects.
- Evaluate rules when a standing or stage is marked as "finished".
- Atomicly update dependent `Gameresult` and `Gameinfo` (officials) objects.

### 3. Component: Placeholder Support
To prevent Scorecard and other UI components from breaking when teams are not yet assigned:
- `GamedayModelWrapper` will be enhanced with `get_team_placeholder(gameinfo_id, is_home)`.
- `GameLogSerializer` will use this method to provide a descriptive name (e.g., "Winner Game 1") instead of `None` or "TBD" when a team is missing.

### 4. Transition & Safety
- **Isolation**: The new logic stays in its own service and only touches gamedays explicitly linked to the Designer.
- **Easy Deprecation**: The legacy `ScheduleUpdate` remains untouched, making it easy to disable once all active leagues have migrated to the Designer.

### 1. Component: GamedayScheduleResolutionService
Located in `gamedays/service/schedule_resolution_service.py`:
- `__init__(gameday_id)`: Initializes with gameday and associated template.
- `update_participants(finished_standing)`: Main entry point for dynamic updates.
- `_apply_rule(rule)`: Applies a `TemplateUpdateRule` by fetching results via `GamedayModelWrapper`.
- `get_game_placeholder(gameinfo_id, is_home)`: Static method to resolve "human-friendly" placeholder name from `TemplateSlot`.

### 2. Component: GamedayModelWrapper
Enhancements in `gamedays/service/model_wrapper.py`:
- `get_team_by(place, standing, points)`: Unified method to retrieve team names based on rankings from a specific standing/stage.
- `is_finished(standing_or_stage)`: Checks if all games in a given group or stage are marked as `Beendet`.

### 3. Revised signals.py
```python
@receiver(post_save, sender=Gameinfo)
def update_game_schedule(sender, instance: Gameinfo, created, **kwargs):
    if instance.status == FINISHED:
        # Check for Designer-based gameday
        if TemplateApplication.objects.filter(gameday=instance.gameday).exists():
            resolution_service = GamedayScheduleResolutionService(instance.gameday_id)
            # Trigger updates for both standing (group) and stage
            if resolution_service.gmw.is_finished(instance.standing):
                resolution_service.update_participants(instance.standing)
            if resolution_service.gmw.is_finished(instance.stage):
                resolution_service.update_participants(instance.stage)
        else:
            # Fallback to legacy JSON-based logic
            update_schedule = ScheduleUpdate(instance.gameday_id, instance.gameday.format)
            update_schedule.update()
```

### 4. GameLogSerializer Integration
Update `_get_team` to use `GamedayScheduleResolutionService.get_game_placeholder` when `name` is `None`.

## Testing & Validation
### 1. Backend Unit Tests
- `TestGamedayProgression`: Verify `GamedayScheduleResolutionService` correctly resolves teams from standings.
- `TestLegacyGameday`: Verify `ScheduleUpdate` still works correctly for gamedays without `TemplateApplication`.

### 2. Integration Tests
- `TestSignalSwitching`: Verify the correct service is called based on the gameday type.
- `TestScorecardPlaceholder`: Verify `GameLogSerializer` returns the correct placeholder string when teams are `None`.

## Deployment Strategy
1. **Branch**: Create a new branch `feature/dual-progression`.
2. **Implement**: Apply the changes in small, verified steps.
3. **QA**: Run the full suite (`pytest`) to ensure no regressions in existing schedule updates.
4. **Final PR**: Merge into `master` after explicit confirmation.
