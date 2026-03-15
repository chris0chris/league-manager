from gamedays.models import Gameday, Gameinfo, Gameresult, GamedayDesignerState, Team


OFFICIALS_PLACEHOLDER = "N/A"


class CanvasPublishService:
    """
    Translates a GamedayDesignerState canvas into Gameinfo + Gameresult DB rows.
    Idempotent: clears any existing Gameinfo rows for the gameday before creating.
    No-ops silently if no designer state exists.
    """

    def __init__(self, gameday: Gameday):
        self.gameday = gameday

    def apply(self) -> None:
        try:
            state = GamedayDesignerState.objects.get(gameday=self.gameday)
        except GamedayDesignerState.DoesNotExist:
            return

        state_data = state.state_data
        nodes = state_data.get("nodes", []) if state_data else []
        game_nodes = [n for n in nodes if n.get("type") == "game"]
        if not game_nodes:
            return

        node_by_id = {n["id"]: n for n in nodes}
        global_teams = {t["id"]: t for t in state_data.get("globalTeams", [])}

        # officials is NOT NULL — use a placeholder when unresolved
        placeholder, _ = Team.objects.get_or_create(
            name=OFFICIALS_PLACEHOLDER,
            defaults={"description": OFFICIALS_PLACEHOLDER, "location": ""},
        )

        Gameinfo.objects.filter(gameday=self.gameday).delete()

        for node in game_nodes:
            data = node.get("data", {})
            stage_node = node_by_id.get(node.get("parentId"), {})
            field_node = node_by_id.get(stage_node.get("parentId", ""), {})

            field_num = field_node.get("data", {}).get("order", 0) + 1
            stage_name = stage_node.get("data", {}).get("name", "")
            standing = data.get("standing", "")
            start_time = data.get("startTime") or str(self.gameday.start)

            officials = self._resolve_official(
                data.get("official"), global_teams, placeholder
            )

            gi = Gameinfo.objects.create(
                gameday=self.gameday,
                scheduled=start_time,
                field=field_num,
                stage=stage_name,
                standing=standing,
                officials=officials,
                status=Gameinfo.STATUS_PUBLISHED,
            )

            Gameresult.objects.create(
                gameinfo=gi,
                team=self._resolve_team(data.get("homeTeamId"), global_teams),
                isHome=True,
            )
            Gameresult.objects.create(
                gameinfo=gi,
                team=self._resolve_team(data.get("awayTeamId"), global_teams),
                isHome=False,
            )

    def _resolve_team(self, team_id, global_teams):
        if not team_id:
            return None
        entry = global_teams.get(team_id)
        if not entry:
            return None
        label = entry.get("label", "")
        if not label:
            return None
        team, _ = Team.objects.get_or_create(
            name=label,
            defaults={"description": label, "location": ""},
        )
        return team

    def _resolve_official(self, official_ref, global_teams, fallback):
        if not official_ref:
            return fallback
        if official_ref.get("type") == "static":
            name = official_ref.get("name", "")
            # Canvas stores canvas team-ID as name; resolve to label if possible
            if name in global_teams:
                name = global_teams[name].get("label", name)
            if name:
                team, _ = Team.objects.get_or_create(
                    name=name,
                    defaults={"description": name, "location": ""},
                )
                return team
        return fallback
