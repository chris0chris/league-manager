from gamedays.models import Gameinfo, Gameresult, GamedayDesignerState


class CanvasBracketProgressionService:
    """
    After a game completes, resolves any downstream playoff games that reference
    this game's winner/loser via homeTeamDynamic / awayTeamDynamic canvas refs.
    """

    def __init__(self, completed_game: Gameinfo):
        self.game = completed_game

    def apply(self) -> None:
        try:
            state = GamedayDesignerState.objects.get(gameday=self.game.gameday)
        except GamedayDesignerState.DoesNotExist:
            return

        nodes = (state.state_data or {}).get("nodes", [])
        game_nodes = [n for n in nodes if n.get("type") == "game"]

        winner_team, loser_team = self._resolve_winner_loser()
        if winner_team is None and loser_team is None:
            return

        for node in game_nodes:
            data = node.get("data", {})
            target_standing = data.get("standing")
            self._try_update(data.get("homeTeamDynamic"), target_standing, True, winner_team, loser_team)
            self._try_update(data.get("awayTeamDynamic"), target_standing, False, winner_team, loser_team)

    def _resolve_winner_loser(self):
        results = list(Gameresult.objects.filter(gameinfo=self.game).select_related("team"))
        if len(results) < 2:
            return None, None
        home = next((r for r in results if r.isHome), None)
        away = next((r for r in results if not r.isHome), None)
        if not home or not away:
            return None, None
        home_total = (home.fh or 0) + (home.sh or 0)
        away_total = (away.fh or 0) + (away.sh or 0)
        if home_total >= away_total:
            return home.team, away.team
        return away.team, home.team

    def _try_update(self, ref, target_standing, is_home, winner_team, loser_team):
        if not ref or not target_standing:
            return
        if ref.get("matchName") != self.game.standing:
            return
        ref_type = ref.get("type")
        if ref_type == "winner":
            team = winner_team
        elif ref_type == "loser":
            team = loser_team
        else:
            return
        try:
            gi = Gameinfo.objects.get(gameday=self.game.gameday, standing=target_standing)
        except Gameinfo.DoesNotExist:
            return
        Gameresult.objects.filter(gameinfo=gi, isHome=is_home).update(team=team)
