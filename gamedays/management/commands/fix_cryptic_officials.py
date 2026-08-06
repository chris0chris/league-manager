"""Fix cryptic official team names from pre-fix canvas publishes.

Before the fix in PR #1778, the gameday designer stored official refs as raw
strings like ``winner:game-<uuid>``. On publish these became ``Team`` rows with
cryptic names that showed up in the public gameday view.

This command scans all ``Team`` rows matching the cryptic pattern, resolves each
to its readable label via the gameday's canvas state, and renames the team
in-place.  It does **not** touch ``Gameinfo`` rows, results, or any other data.

Usage
-----
Dry-run (default)::

    python manage.py fix_cryptic_officials

Fix everything::

    python manage.py fix_cryptic_officials --execute

Scope to one gameday::

    python manage.py fix_cryptic_officials --gameday 874 --execute

Safety
------
* DRY-RUN by default — nothing is written without ``--execute``.
* ``--execute`` runs inside a single transaction that is committed only after
  all resolutions succeed; any failure rolls back everything.
* Prints a before/after table of every change.
* Only touches ``Team.name`` for rows matching the cryptic pattern — no deletes,
  no cascade risk.
"""

from __future__ import annotations

import re
from datetime import datetime

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from gamedays.models import Gameday, GamedayDesignerState, Gameinfo, Team
from gamedays.service.canvas_publish_service import CanvasPublishService

CRYPTIC_RE = re.compile(r"^(winner|loser):game-([0-9a-f-]+)$")


class Command(BaseCommand):
    help = (
        "Fix cryptic official team names ('winner:game-<uuid>') created by "
        "pre-#1778 canvas publishes. Dry-run by default."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--execute", action="store_true",
            help="Actually commit the changes. Without it, this is a dry-run.",
        )
        parser.add_argument(
            "--gameday", type=int,
            help="Scope to a single gameday (by id).",
        )

    def handle(self, *args, **opts):
        execute = opts["execute"]
        gameday_id = opts["gameday"]
        mode = "EXECUTE" if execute else "DRY RUN"

        self.stdout.write(self.style.WARNING(
            f"=== fix_cryptic_officials [{mode}] ==="))

        # 1. Find all cryptic official teams
        cryptic_teams = Team.objects.filter(
            name__regex=CRYPTIC_RE.pattern,
        )
        if gameday_id:
            # Narrow to teams referenced by this gameday's Gameinfos
            gameinfo_ids = list(
                Gameinfo.objects.filter(gameday_id=gameday_id)
                .values_list("officials_id", flat=True)
            )
            cryptic_teams = cryptic_teams.filter(id__in=gameinfo_ids)

        cryptic_teams = list(cryptic_teams)
        if not cryptic_teams:
            self.stdout.write(self.style.SUCCESS(
                "No cryptic official teams found. Nothing to do."))
            return

        self.stdout.write(f"Found {len(cryptic_teams)} cryptic official team(s).")

        # 2. Resolve each to a readable label
        changes = []  # (team_id, old_name, new_name, source)
        unresolvable = []  # (team_id, name, reason)

        for team in cryptic_teams:
            match = CRYPTIC_RE.match(team.name)
            if not match:
                continue
            ref_type, game_uuid = match.group(1), match.group(2)

            # Find which gameday(s) reference this team
            referencing_gis = Gameinfo.objects.filter(officials_id=team.id)
            if gameday_id:
                referencing_gis = referencing_gis.filter(gameday_id=gameday_id)

            resolved = False
            for gi in referencing_gis:
                canvas_state = self._load_canvas_state(gi.gameday_id)
                if not canvas_state:
                    unresolvable.append((
                        team.id, team.name,
                        f"No canvas state for gameday {gi.gameday_id}",
                    ))
                    continue

                standing = self._find_standing_for_uuid(
                    canvas_state, game_uuid
                )
                if not standing:
                    unresolvable.append((
                        team.id, team.name,
                        f"Game UUID {game_uuid} not found in canvas for gameday {gi.gameday_id}",
                    ))
                    continue

                ref = {"type": ref_type, "matchName": standing}
                new_name = CanvasPublishService._format_dynamic_ref(ref)
                if new_name:
                    changes.append((team.id, team.name, new_name, f"gameday {gi.gameday_id}"))
                    resolved = True
                    break  # one resolution per team is enough

            if not resolved and team.id not in [u[0] for u in unresolvable]:
                unresolvable.append((
                    team.id, team.name,
                    "No referencing Gameinfo found",
                ))

        # 3. Report
        self._print_results(changes, unresolvable)

        if not changes:
            self.stdout.write(self.style.WARNING(
                "No resolvable changes. Check unresolvable list above."))
            return

        # 4. Apply (or dry-run)
        if execute:
            try:
                with transaction.atomic():
                    for team_id, _old, new_name, _source in changes:
                        Team.objects.filter(id=team_id).update(name=new_name)
                self.stdout.write(self.style.SUCCESS(
                    f"COMMITTED {len(changes)} team rename(s)."))
            except Exception as exc:
                raise CommandError(f"Failed (rolled back): {exc}")
        else:
            self.stdout.write(self.style.WARNING(
                f"DRY RUN complete — {len(changes)} change(s) would be applied. "
                "Re-run with --execute to commit."))

    # -- helpers ---------------------------------------------------------------

    @staticmethod
    def _load_canvas_state(gameday_id):
        """Return the state_data dict for a gameday, or None."""
        try:
            state = GamedayDesignerState.objects.get(gameday_id=gameday_id)
            return state.state_data or {}
        except GamedayDesignerState.DoesNotExist:
            return None

    @staticmethod
    def _find_standing_for_uuid(canvas_state, game_uuid):
        """Walk canvas nodes to find a game node whose id contains the UUID."""
        nodes = canvas_state.get("nodes", [])
        for node in nodes:
            if node.get("type") != "game":
                continue
            node_id = node.get("id", "")
            # Canvas game IDs look like "game-<uuid>"
            if game_uuid in node_id:
                data = node.get("data", {})
                return data.get("standing")
        return None

    def _print_results(self, changes, unresolvable):
        if changes:
            self.stdout.write(self.style.SUCCESS("\nResolvable changes:"))
            self.stdout.write(f"  {'Team ID':>8}  {'Old Name':<35}  {'New Name':<30}  Source")
            for team_id, old, new, source in changes:
                self.stdout.write(f"  {team_id:>8}  {old:<35}  {new:<30}  {source}")

        if unresolvable:
            self.stdout.write(self.style.WARNING("\nUnresolvable (manual fix needed):"))
            for team_id, name, reason in unresolvable:
                self.stdout.write(f"  Team {team_id} ({name}): {reason}")
