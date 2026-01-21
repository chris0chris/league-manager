"""
Template Validation Service.

Mirrors frontend useFlowValidation.ts logic to ensure data integrity
of tournament schedule templates.
"""

import re
from dataclasses import dataclass
from typing import List, Set, Dict, Optional, Tuple
from django.core.exceptions import ValidationError

from gameday_designer.models import ScheduleTemplate, TemplateSlot


@dataclass
class ValidationIssue:
    """Represents a validation error or warning."""

    id: str
    type: str
    message: str
    affected_slots: List[int]  # List of TemplateSlot IDs


class TemplateValidationService:
    """
    Validates a ScheduleTemplate for logical consistency.
    """

    def __init__(self, template: ScheduleTemplate):
        self.template = template
        self.errors: List[ValidationIssue] = []
        self.warnings: List[ValidationIssue] = []

    def validate(self) -> Tuple[bool, List[ValidationIssue], List[ValidationIssue]]:
        """
        Perform all validations.

        Returns:
            Tuple of (is_valid, errors, warnings)
        """
        self.errors = []
        self.warnings = []

        slots = list(self.template.slots.all())

        self._check_incomplete_inputs(slots)
        self._check_circular_dependencies(slots)
        self._check_official_playing(slots)
        self._check_duplicate_standings(slots)

        return len(self.errors) == 0, self.errors, self.warnings

    def _check_incomplete_inputs(self, slots: List[TemplateSlot]):
        """Check for games missing home or away team definitions."""
        for slot in slots:
            missing = []
            # In template, a team is 'missing' if BOTH direct assignment and reference are None
            if slot.home_group is None and not slot.home_reference:
                missing.append("home")
            if slot.away_group is None and not slot.away_reference:
                missing.append("away")

            if missing:
                self.errors.append(
                    ValidationIssue(
                        id=f"{slot.id}_incomplete",
                        type="incomplete_game_inputs",
                        message=f"Game '{slot.standing}' is missing {' and '.join(missing)} team connection",
                        affected_slots=[slot.id],
                    )
                )

    def _extract_standing_from_ref(self, reference: str) -> Optional[str]:
        """
        Extract the game standing name from a reference string.
        Example: 'Gewinner HF1' -> 'HF1'
        """
        if not reference:
            return None
        # Pattern matches 'Gewinner ' or 'Verlierer ' followed by the standing name
        match = re.search(r"(?:Gewinner|Verlierer)\s+(.+)$", reference)
        if match:
            return match.group(1).strip()
        return None

    def _check_circular_dependencies(self, slots: List[TemplateSlot]):
        """Check for circular dependencies in winner/loser progressions."""
        # Map standing names to slots for easy lookup
        standing_to_slot = {s.standing: s for s in slots if s.standing}

        # Build adjacency list: standing -> list of standings that depend on it
        # Actually, simpler to think: target depends on source
        adj = {s.standing: [] for s in slots if s.standing}
        for slot in slots:
            # Home reference
            ref_home = self._extract_standing_from_ref(slot.home_reference)
            if ref_home and ref_home in adj:
                adj[ref_home].append(slot.standing)

            # Away reference
            ref_away = self._extract_standing_from_ref(slot.away_reference)
            if ref_away and ref_away in adj:
                adj[ref_away].append(slot.standing)

        # Cycle detection using DFS
        visited = set()
        path_stack = []

        def find_cycle(u):
            visited.add(u)
            path_stack.append(u)

            for v in adj.get(u, []):
                if v in path_stack:
                    # Found cycle
                    cycle_start_idx = path_stack.index(v)
                    return path_stack[cycle_start_idx:]
                if v not in visited:
                    res = find_cycle(v)
                    if res:
                        return res

            path_stack.pop()
            return None

        reported_cycles = set()
        for s in adj:
            if s not in visited:
                cycle = find_cycle(s)
                if cycle:
                    cycle_key = "-".join(sorted(cycle))
                    if cycle_key not in reported_cycles:
                        reported_cycles.add(cycle_key)
                        affected_ids = [standing_to_slot[name].id for name in cycle]
                        self.errors.append(
                            ValidationIssue(
                                id=f"circular_{cycle_key}",
                                type="circular_dependency",
                                message=f"Circular dependency detected: {' -> '.join(cycle)} -> {cycle[0]}",
                                affected_slots=affected_ids,
                            )
                        )

    def _check_official_playing(self, slots: List[TemplateSlot]):
        """Check if official team is also playing in the same game."""
        for slot in slots:
            # Only check if official is explicitly assigned by group/team (placeholders)
            if slot.official_group is not None:
                # Home
                if (
                    slot.home_group == slot.official_group
                    and slot.home_team == slot.official_team
                ):
                    self.errors.append(
                        ValidationIssue(
                            id=f"{slot.id}_official_home",
                            type="official_playing",
                            message=f"Game '{slot.standing}': Official team cannot play in this game",
                            affected_slots=[slot.id],
                        )
                    )
                    continue
                # Away
                if (
                    slot.away_group == slot.official_group
                    and slot.away_team == slot.official_team
                ):
                    self.errors.append(
                        ValidationIssue(
                            id=f"{slot.id}_official_away",
                            type="official_playing",
                            message=f"Game '{slot.standing}': Official team cannot play in this game",
                            affected_slots=[slot.id],
                        )
                    )

    def _check_duplicate_standings(self, slots: List[TemplateSlot]):
        """Check for duplicate standing names."""
        counts = {}
        for slot in slots:
            if slot.standing:
                if slot.standing not in counts:
                    counts[slot.standing] = []
                counts[slot.standing].append(slot.id)

        for standing, ids in counts.items():
            if len(ids) > 1:
                self.warnings.append(
                    ValidationIssue(
                        id=f"duplicate_{standing}",
                        type="duplicate_standing",
                        message=f"Standing '{standing}' is used by {len(ids)} games",
                        affected_slots=ids,
                    )
                )
