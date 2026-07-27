from collections import defaultdict

from gamedays.models import Gameday, GamedayDesignerState, Gameinfo


class AutoAssignOfficialsError(Exception):
    pass


class AutoAssignOfficialsService:
    def __init__(self, gameday_id: int):
        self.gameday_id = gameday_id

    def assign(self) -> dict:
        gameday = Gameday.objects.get(pk=self.gameday_id)
        if gameday.status != "DRAFT":
            raise AutoAssignOfficialsError("Gameday must be in DRAFT status")

        gameinfos = list(
            Gameinfo.objects.filter(gameday_id=self.gameday_id).prefetch_related(
                "gameresult_set"
            )
        )
        if gameinfos:
            return self._assign_from_gameinfos(gameinfos)

        # A DRAFT gameday that has never been published (or whose Gameinfo
        # rows were cleared) has its games only as JSON nodes in
        # GamedayDesignerState.state_data -- Gameinfo/Gameresult rows are
        # only materialized by CanvasPublishService at publish time.
        return self._assign_from_designer_state()

    def _assign_from_gameinfos(self, gameinfos: list[Gameinfo]) -> dict[int, int]:
        all_teams_in_standing: dict[str, set[int]] = defaultdict(set)
        for gi in gameinfos:
            for gr in gi.gameresult_set.all():
                if gr.team_id:
                    all_teams_in_standing[gi.standing].add(gr.team_id)

        time_groups: dict[str, list[Gameinfo]] = defaultdict(list)
        for gi in gameinfos:
            time_groups[gi.scheduled.isoformat()].append(gi)

        referee_count: dict[int, int] = defaultdict(int)
        assignments: dict[int, int] = {}

        scheduled_times = sorted(time_groups.keys())

        for scheduled in scheduled_times:
            games_at_time = time_groups[scheduled]

            busy_teams: set[int] = set()
            for gi in games_at_time:
                for gr in gi.gameresult_set.all():
                    if gr.team_id:
                        busy_teams.add(gr.team_id)

            # How many distinct *real* fields are in play at this exact
            # timeslot. If it's just one, games sharing this timeslot can't
            # truly be concurrent (a field only hosts one game at a time),
            # so a team playing in another game here is safe to referee.
            # Scoped per-timeslot (not gameday-wide) so an unrelated later
            # game on a second field doesn't block an earlier single-field
            # slot.
            num_fields_at_time = len({gi.field for gi in games_at_time})

            groups: dict[str, list[Gameinfo]] = defaultdict(list)
            for gi in games_at_time:
                groups[gi.standing].append(gi)

            slot_assigned: set[int] = set()

            for standing, gis in groups.items():
                donor_pool: set[int] = set()
                for other_standing, teams in all_teams_in_standing.items():
                    if other_standing != standing:
                        donor_pool |= teams

                if not donor_pool:
                    donor_pool = all_teams_in_standing[standing].copy()

                eligible = [
                    t
                    for t in donor_pool
                    if t not in busy_teams and t not in slot_assigned
                ]

                if not eligible:
                    if num_fields_at_time > 1:
                        continue
                    for gi in gis:
                        game_busy = {
                            gr.team_id
                            for gr in gi.gameresult_set.all()
                            if gr.team_id
                        }
                        per_game_eligible = [
                            t for t in donor_pool if t not in game_busy
                        ]
                        if not per_game_eligible:
                            continue
                        per_game_eligible.sort(key=lambda t: referee_count[t])
                        chosen = per_game_eligible.pop(0)
                        gi.officials_id = chosen
                        gi.save(update_fields=["officials"])
                        referee_count[chosen] += 1
                        assignments[gi.pk] = chosen
                    continue

                for gi in gis:
                    if not eligible:
                        break
                    eligible.sort(key=lambda t: referee_count[t])
                    chosen = eligible.pop(0)
                    gi.officials_id = chosen
                    gi.save(update_fields=["officials"])
                    referee_count[chosen] += 1
                    assignments[gi.pk] = chosen
                    slot_assigned.add(chosen)

        return assignments

    def _get_num_fields(self) -> int:
        try:
            gameday = Gameday.objects.get(pk=self.gameday_id)
            parts = gameday.format.split("_")
            return int(parts[1]) if len(parts) == 2 else 1
        except (Gameday.DoesNotExist, ValueError, IndexError):
            return 1

    def _assign_from_designer_state(self) -> dict[str, str]:
        try:
            state = GamedayDesignerState.objects.get(gameday_id=self.gameday_id)
        except GamedayDesignerState.DoesNotExist:
            return {}

        state_data = state.state_data or {}
        nodes = state_data.get("nodes", [])
        game_nodes = [n for n in nodes if n.get("type") == "game"]
        if not game_nodes:
            return {}

        all_team_ids: set[str] = {
            t["id"] for t in state_data.get("globalTeams", []) if t.get("id")
        }

        # Prefer the number of field nodes actually present on the current
        # canvas over the gameday's template format string, which goes
        # stale as soon as a user adds/removes a field in the designer
        # without recreating the gameday (e.g. a "6_2" template reduced to
        # a single field still reports 2 fields via format alone).
        field_node_count = sum(1 for n in nodes if n.get("type") == "field")
        num_fields = field_node_count if field_node_count else self._get_num_fields()

        all_teams_in_standing: dict[str, set[str]] = defaultdict(set)
        for node in game_nodes:
            data = node.get("data", {})
            standing = data.get("standing", "")
            for key in ("homeTeamId", "awayTeamId"):
                team_id = data.get(key)
                if team_id:
                    all_teams_in_standing[standing].add(team_id)

        def time_key(node: dict) -> str:
            data = node.get("data", {})
            if data.get("manualTime") and data.get("startTime"):
                return f"time:{data['startTime']}"
            # Auto-scheduled games are computed client-side from cumulative
            # durations and never persisted with an absolute time, so real
            # concurrency can't be detected here. Treat every game in the
            # same stage as a shared time window rather than risk assigning
            # a referee who is also playing elsewhere at the same time.
            return f"stage:{node.get('parentId', '')}"

        time_groups: dict[str, list[dict]] = defaultdict(list)
        for node in game_nodes:
            time_groups[time_key(node)].append(node)

        referee_count: dict[str, int] = defaultdict(int)
        assignments: dict[str, str] = {}

        for key in sorted(time_groups.keys()):
            games_at_time = time_groups[key]

            busy_teams: set[str] = set()
            for node in games_at_time:
                data = node.get("data", {})
                for tkey in ("homeTeamId", "awayTeamId"):
                    if data.get(tkey):
                        busy_teams.add(data[tkey])

            groups: dict[str, list[dict]] = defaultdict(list)
            for node in games_at_time:
                groups[node.get("data", {}).get("standing", "")].append(node)

            slot_assigned: set[str] = set()

            for standing, group_nodes in groups.items():
                donor_pool: set[str] = set()
                for other_standing, teams in all_teams_in_standing.items():
                    if other_standing != standing:
                        donor_pool |= teams

                if not donor_pool:
                    # No other game to draw a referee from -- widen to the
                    # full registered team pool, since a team that hasn't
                    # been placed into any game slot yet is free to referee.
                    donor_pool = all_team_ids.copy()

                eligible = [
                    t
                    for t in donor_pool
                    if t not in busy_teams and t not in slot_assigned
                ]

                if not eligible:
                    if num_fields > 1:
                        continue
                    for node in group_nodes:
                        data = node.get("data", {})
                        game_busy: set[str] = set()
                        for tkey in ("homeTeamId", "awayTeamId"):
                            if data.get(tkey):
                                game_busy.add(data[tkey])
                        per_game_eligible = [
                            t
                            for t in donor_pool
                            if t not in game_busy
                        ]
                        if not per_game_eligible:
                            continue
                        per_game_eligible.sort(key=lambda t: referee_count[t])
                        chosen = per_game_eligible.pop(0)
                        node["data"]["official"] = {"type": "static", "name": chosen}
                        referee_count[chosen] += 1
                        assignments[node["id"]] = chosen
                    continue

                for node in group_nodes:
                    if not eligible:
                        break
                    eligible.sort(key=lambda t: referee_count[t])
                    chosen = eligible.pop(0)
                    node["data"]["official"] = {"type": "static", "name": chosen}
                    referee_count[chosen] += 1
                    assignments[node["id"]] = chosen
                    slot_assigned.add(chosen)

        state.state_data = state_data
        state.save(update_fields=["state_data"])

        return assignments
