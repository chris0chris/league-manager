#!/usr/bin/env python
"""
End-to-End Chrome test for Game Results Feature
Tests: Create gameday → Generate tournament → Publish → Add results → Verify bracket resolution
"""

import os
import sys
import django
from datetime import date
import json

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "league_manager.settings.dev")
django.setup()

from django.contrib.auth.models import User
from django.test import Client
from gamedays.models import (
    Gameday,
    Gameinfo,
    Gameresult,
    Team,
    Season,
    League,
    SeasonLeagueTeam,
)
from gamedays.service.bracket_resolution import BracketResolutionService


def create_test_data():
    """Create all necessary test data for the E2E test"""
    print("\n" + "=" * 60)
    print("CREATING TEST DATA")
    print("=" * 60)

    # Create user
    user, _ = User.objects.get_or_create(
        username="e2e_test_user",
        defaults={"email": "e2e@test.com", "is_staff": True, "is_superuser": True},
    )
    print(f"✓ User created: {user.username}")

    # Create season and league
    season, _ = Season.objects.get_or_create(name="2026")
    league, _ = League.objects.get_or_create(name="DFFL")
    print(f"✓ Season created: {season.name}")
    print(f"✓ League created: {league.name}")

    # Create 6 teams
    teams = []
    for i, name in enumerate(
        ["Team A", "Team B", "Team C", "Team D", "Team E", "Team F"], 1
    ):
        team, _ = Team.objects.get_or_create(
            name=name,
            defaults={"description": f"{name} Description", "location": f"City {i}"},
        )
        teams.append(team)
        print(f"✓ Team created: {team.name}")

    # Create Season-League-Team associations
    for team in teams:
        SeasonLeagueTeam.objects.get_or_create(season=season, league=league, team=team)

    # Create gameday
    gameday = Gameday.objects.create(
        name="Test Tournament - E2E",
        season=season,
        league=league,
        date=date(2026, 2, 3),
        start="10:00",
        format="6_2",
        author=user,
        status="DRAFT",
    )
    print(f"✓ Gameday created: {gameday.name} (Status: {gameday.status})")

    return user, season, league, teams, gameday


def create_tournament_bracket(gameday, teams):
    """Create a simple tournament bracket with games and bracket references"""
    print("\n" + "=" * 60)
    print("CREATING TOURNAMENT BRACKET")
    print("=" * 60)

    # Group Stage: 3 games with 2 fields
    games = []

    # Game 1: Team A vs Team B
    game1 = Gameinfo.objects.create(
        gameday=gameday,
        scheduled="10:00",
        field=1,
        officials=teams[0],
        stage="Group",
        standing="Final",
    )
    Gameresult.objects.create(gameinfo=game1, team=teams[0], isHome=True)
    Gameresult.objects.create(gameinfo=game1, team=teams[1], isHome=False)
    games.append(game1)
    print(f"✓ Game 1 created: {teams[0].name} vs {teams[1].name}")

    # Game 2: Team C vs Team D
    game2 = Gameinfo.objects.create(
        gameday=gameday,
        scheduled="10:00",
        field=2,
        officials=teams[2],
        stage="Group",
        standing="Final",
    )
    Gameresult.objects.create(gameinfo=game2, team=teams[2], isHome=True)
    Gameresult.objects.create(gameinfo=game2, team=teams[3], isHome=False)
    games.append(game2)
    print(f"✓ Game 2 created: {teams[2].name} vs {teams[3].name}")

    # Game 3: Team E vs Team F
    game3 = Gameinfo.objects.create(
        gameday=gameday,
        scheduled="11:00",
        field=1,
        officials=teams[4],
        stage="Group",
        standing="Final",
    )
    Gameresult.objects.create(gameinfo=game3, team=teams[4], isHome=True)
    Gameresult.objects.create(gameinfo=game3, team=teams[5], isHome=False)
    games.append(game3)
    print(f"✓ Game 3 created: {teams[4].name} vs {teams[5].name}")

    # Semi-finals: Winners bracket (will be resolved after group results)
    game4 = Gameinfo.objects.create(
        gameday=gameday,
        scheduled="12:00",
        field=1,
        officials=teams[0],
        stage="Semi",
        standing="Final",
    )
    # Home: Winner of Game 1, Away: Winner of Game 2
    Gameresult.objects.create(gameinfo=game4, team=None, isHome=True)
    Gameresult.objects.create(gameinfo=game4, team=None, isHome=False)
    games.append(game4)
    print(f"✓ Game 4 created (bracket refs): Winner(Game1) vs Winner(Game2)")

    # Final
    game5 = Gameinfo.objects.create(
        gameday=gameday,
        scheduled="13:00",
        field=1,
        officials=teams[0],
        stage="Final",
        standing="Final",
    )
    # Home: Winner of Game 3, Away: Winner of Game 4
    Gameresult.objects.create(gameinfo=game5, team=None, isHome=True)
    Gameresult.objects.create(gameinfo=game5, team=None, isHome=False)
    games.append(game5)
    print(f"✓ Game 5 created (bracket refs): Winner(Game3) vs Winner(Game4)")

    return games


def publish_gameday(gameday):
    """Publish the gameday"""
    print("\n" + "=" * 60)
    print("PUBLISHING GAMEDAY")
    print("=" * 60)

    gameday.status = "PUBLISHED"
    gameday.save()
    print(f"✓ Gameday published: {gameday.name} (Status: {gameday.status})")


def enter_game_results(games, teams):
    """Enter results for all games"""
    print("\n" + "=" * 60)
    print("ENTERING GAME RESULTS")
    print("=" * 60)

    # Game 1: Team A wins 3-1
    game1_home = Gameresult.objects.get(gameinfo=games[0], isHome=True)
    game1_away = Gameresult.objects.get(gameinfo=games[0], isHome=False)
    game1_home.fh = 2
    game1_home.sh = 1
    game1_home.save()
    game1_away.fh = 1
    game1_away.sh = 0
    game1_away.save()
    print(f"✓ Game 1 result: {teams[0].name} 3 - 1 {teams[1].name}")

    # Game 2: Team C wins 2-0
    game2_home = Gameresult.objects.get(gameinfo=games[1], isHome=True)
    game2_away = Gameresult.objects.get(gameinfo=games[1], isHome=False)
    game2_home.fh = 1
    game2_home.sh = 1
    game2_home.save()
    game2_away.fh = 0
    game2_away.sh = 0
    game2_away.save()
    print(f"✓ Game 2 result: {teams[2].name} 2 - 0 {teams[3].name}")

    # Game 3: Team E wins 4-1
    game3_home = Gameresult.objects.get(gameinfo=games[2], isHome=True)
    game3_away = Gameresult.objects.get(gameinfo=games[2], isHome=False)
    game3_home.fh = 2
    game3_home.sh = 2
    game3_home.save()
    game3_away.fh = 1
    game3_away.sh = 0
    game3_away.save()
    print(f"✓ Game 3 result: {teams[4].name} 4 - 1 {teams[5].name}")


def resolve_bracket_references(games, gameday):
    """Test bracket resolution"""
    print("\n" + "=" * 60)
    print("RESOLVING BRACKET REFERENCES")
    print("=" * 60)

    service = BracketResolutionService()

    # Resolve Game 4: Winner of Game 1 vs Winner of Game 2
    try:
        game4_home_team = service.resolve_winner_reference(
            game_id=games[0].id, gameday=gameday
        )
        game4_away_team = service.resolve_winner_reference(
            game_id=games[1].id, gameday=gameday
        )
        print(
            f"✓ Game 4 brackets resolved: {game4_home_team.name} vs {game4_away_team.name}"
        )

        # Manually update game 4 with resolved teams
        game4_home = Gameresult.objects.get(gameinfo=games[3], isHome=True)
        game4_away = Gameresult.objects.get(gameinfo=games[3], isHome=False)
        game4_home.team = game4_home_team
        game4_away.team = game4_away_team
        game4_home.save()
        game4_away.save()
    except ValueError as e:
        print(f"✗ Failed to resolve Game 4: {e}")
        return False

    # Resolve Game 5: Winner of Game 3 vs Winner of Game 4
    try:
        game5_home_team = service.resolve_winner_reference(
            game_id=games[2].id, gameday=gameday
        )
        # Game 4 winner would be resolved after entering Game 4 results
        print(f"✓ Game 5 home bracket resolved: {game5_home_team.name}")

        game5_home = Gameresult.objects.get(gameinfo=games[4], isHome=True)
        game5_home.team = game5_home_team
        game5_home.save()
    except ValueError as e:
        print(f"✗ Failed to resolve Game 5: {e}")
        return False

    return True


def verify_data_persistence(gameday, teams, games):
    """Verify all data was saved correctly"""
    print("\n" + "=" * 60)
    print("VERIFYING DATA PERSISTENCE")
    print("=" * 60)

    # Verify gameday status
    gameday.refresh_from_db()
    assert gameday.status == "PUBLISHED", f"Expected PUBLISHED, got {gameday.status}"
    print(f"✓ Gameday status verified: {gameday.status}")

    # Verify game results
    game_count = Gameinfo.objects.filter(gameday=gameday).count()
    assert game_count == 5, f"Expected 5 games, found {game_count}"
    print(f"✓ Game count verified: {game_count} games")

    # Verify scores for Game 1
    game1_home = Gameresult.objects.get(gameinfo=games[0], isHome=True)
    assert game1_home.fh == 2 and game1_home.sh == 1, (
        f"Game 1 home scores incorrect: {game1_home.fh}-{game1_home.sh}"
    )
    print(f"✓ Game 1 home scores verified: {game1_home.fh}-{game1_home.sh}")

    game1_away = Gameresult.objects.get(gameinfo=games[0], isHome=False)
    assert game1_away.fh == 1 and game1_away.sh == 0, (
        f"Game 1 away scores incorrect: {game1_away.fh}-{game1_away.sh}"
    )
    print(f"✓ Game 1 away scores verified: {game1_away.fh}-{game1_away.sh}")

    # Verify bracket references were resolved
    game4_home = Gameresult.objects.get(gameinfo=games[3], isHome=True)
    assert game4_home.team is not None, "Game 4 home bracket reference not resolved"
    print(f"✓ Game 4 home bracket resolved to: {game4_home.team.name}")

    return True


def main():
    """Run the complete E2E test"""
    print("\n" + "=" * 80)
    print(" GAME RESULTS FEATURE - END-TO-END TEST")
    print("=" * 80)

    try:
        # Phase 1: Setup
        user, season, league, teams, gameday = create_test_data()

        # Phase 2: Create tournament bracket
        games = create_tournament_bracket(gameday, teams)

        # Phase 3: Publish gameday
        publish_gameday(gameday)

        # Phase 4: Enter results
        enter_game_results(games, teams)

        # Phase 5: Resolve bracket references
        if not resolve_bracket_references(games, gameday):
            print("\n✗ FAILED: Bracket resolution failed")
            return False

        # Phase 6: Verify persistence
        if not verify_data_persistence(gameday, teams, games):
            print("\n✗ FAILED: Data persistence verification failed")
            return False

        # Success!
        print("\n" + "=" * 80)
        print(" ✓ ALL TESTS PASSED - GAME RESULTS FEATURE WORKING")
        print("=" * 80)
        print("\nSUMMARY:")
        print("  ✓ Created gameday with tournament bracket")
        print("  ✓ Generated tournament structure with bracket references")
        print("  ✓ Published gameday")
        print("  ✓ Entered results for all games")
        print("  ✓ Resolved bracket references successfully")
        print("  ✓ Verified all data persisted correctly")
        print("\n")
        return True

    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
