from typing import Optional, List
from gamedays.models import Gameday, Gameinfo, Gameresult, Team


class BracketResolutionService:
    """Service for resolving bracket references in tournament games"""

    def resolve_winner_reference(
        self, game_id: int, gameday: Gameday
    ) -> Optional[Team]:
        """
        Resolve a 'Winner of Game X' reference to the actual team.

        Args:
            game_id: The source game ID
            gameday: The gameday containing the game

        Returns:
            The winning team from the referenced game

        Raises:
            ValueError: If the game result is not yet entered
        """
        try:
            game = Gameinfo.objects.get(gameday=gameday, id=game_id)
        except Gameinfo.DoesNotExist:
            raise ValueError(f"Game {game_id} not found")

        results = Gameresult.objects.filter(gameinfo=game)
        if not results.exists():
            raise ValueError(f"Cannot resolve: Game {game_id} has no results entered")

        # Find which team won (higher total score)
        home_result = results.get(isHome=True)
        away_result = results.get(isHome=False)

        if home_result.fh is None or away_result.fh is None:
            raise ValueError(f"Cannot resolve: Game {game_id} result incomplete")

        home_total = (home_result.fh or 0) + (home_result.sh or 0)
        away_total = (away_result.fh or 0) + (away_result.sh or 0)

        if home_total > away_total:
            return home_result.team
        elif away_total > home_total:
            return away_result.team
        else:
            # Handle draw case - could use away team or raise error
            raise ValueError(f"Cannot resolve: Game {game_id} ended in a draw")

    def get_unresolved_references(self, gameday: Gameday) -> List[Gameinfo]:
        """
        Get all games that have unresolved bracket references.

        Args:
            gameday: The gameday to check

        Returns:
            List of games with unresolved references
        """
        # For MVP: return games where a result team is None (indicates bracket ref)
        unresolved_games = []
        games = Gameinfo.objects.filter(gameday=gameday)

        for game in games:
            results = Gameresult.objects.filter(gameinfo=game)
            for result in results:
                if result.team is None:
                    unresolved_games.append(game)
                    break

        return unresolved_games
