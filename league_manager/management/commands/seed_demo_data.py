from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from gamedays.models import Team, Season, League, Association, SeasonLeagueTeam, Gameday, Gameinfo, Gameresult, Person
from passcheck.models import Player, Playerlist
from league_table.models import LeagueGroup
import random
from datetime import datetime, timedelta, date


class Command(BaseCommand):
    help = 'Seed demo database with synthetic data for demo.leaguesphere.app'

    def handle(self, *args, **options):
        self.stdout.write("Starting demo data seeding...")

        # Create demo associations
        associations = self.create_associations()
        self.stdout.write(f"✓ Created {len(associations)} associations")

        # Create demo leagues
        leagues = self.create_leagues()
        self.stdout.write(f"✓ Created {len(leagues)} leagues")

        # Create demo seasons
        seasons = self.create_seasons()
        self.stdout.write(f"✓ Created {len(seasons)} seasons")

        # Create demo teams
        teams = self.create_teams(associations)
        self.stdout.write(f"✓ Created {len(teams)} teams")

        # Create season-league-team relationships
        self.create_season_league_teams(seasons, leagues, teams)
        self.stdout.write("✓ Created season-league-team relationships")

        # Create players for teams
        players_count = self.create_team_players(teams)
        self.stdout.write(f"✓ Created {players_count} players for teams")

        # Create demo users by role
        self.create_demo_users()
        self.stdout.write("✓ Created demo user accounts")

        # Create gamedays with games
        gamedays_count = self.create_gamedays(seasons, leagues, teams)
        self.stdout.write(f"✓ Created {gamedays_count} gamedays with sample games")

        self.stdout.write(self.style.SUCCESS("✅ Demo data seeding completed successfully!"))

    def create_associations(self):
        """Create demo associations representing different regional governing bodies."""
        associations_data = [
            {'abbr': 'MPL', 'name': 'Metropolitan Premier League'},
            {'abbr': 'UNC', 'name': 'United Nations Cup'},
            {'abbr': 'CSF', 'name': 'Continental Soccer Federation'},
            {'abbr': 'RSF', 'name': 'Regional Soccer Federation'},
        ]
        associations = []
        for data in associations_data:
            assoc, created = Association.objects.get_or_create(
                abbr=data['abbr'],
                defaults={'name': data['name']}
            )
            associations.append(assoc)
        return associations

    def create_leagues(self):
        """Create demo leagues."""
        league_names = [
            'Premier Division',
            'Championship Division',
            'League One',
            'League Two',
        ]
        leagues = []
        for name in league_names:
            league, created = League.objects.get_or_create(
                name=name,
                defaults={'slug': name.lower().replace(' ', '-')}
            )
            leagues.append(league)
        return leagues

    def create_seasons(self):
        """Create demo seasons."""
        season_names = [
            '2023/2024',
            '2024/2025',
            '2025/2026',
        ]
        seasons = []
        for name in season_names:
            season, created = Season.objects.get_or_create(
                name=name,
                defaults={'slug': name.lower().replace('/', '-')}
            )
            seasons.append(season)
        return seasons

    def create_teams(self, associations):
        """Create demo teams with predefined data."""
        team_data = [
            {'name': 'Phoenix United', 'description': 'The rising bird team from the north'},
            {'name': 'Stellar Strikers', 'description': 'Bright stars of the south'},
            {'name': 'Velocity FC', 'description': 'Speed and precision football'},
            {'name': 'Thunder Titans', 'description': 'Mighty and powerful'},
            {'name': 'Crystal Eagles', 'description': 'Pure and soaring high'},
            {'name': 'Quantum Wolves', 'description': 'Advanced and fierce'},
            {'name': 'Solar Panthers', 'description': 'Energetic and athletic'},
            {'name': 'Nexus Rockets', 'description': 'Connected and fast'},
            {'name': 'Zenith Dragons', 'description': 'Peak performance team'},
            {'name': 'Horizon Falcons', 'description': 'Looking forward and determined'},
            {'name': 'Infinity Cougars', 'description': 'Endless potential and strength'},
            {'name': 'Aurora Leopards', 'description': 'Beautiful dawn athletes'},
        ]

        teams = []
        for team_info in team_data:
            team, created = Team.objects.get_or_create(
                name=team_info['name'],
                defaults={
                    'description': team_info['description'],
                    'location': f"Demo City {random.randint(1, 50)}",
                    'association': random.choice(associations),
                }
            )
            teams.append(team)
        return teams

    def create_season_league_teams(self, seasons, leagues, teams):
        """Create relationships between seasons, leagues, and teams."""
        # For the latest season (2025/2026), associate teams with leagues
        if seasons:
            latest_season = seasons[-1]  # 2025/2026
            for league in leagues:
                # Distribute teams evenly across leagues
                league_teams = []
                for i in range(3):  # 3 teams per league
                    team_idx = (leagues.index(league) * 3 + i) % len(teams)
                    league_teams.append(teams[team_idx])

                season_league_team, created = SeasonLeagueTeam.objects.get_or_create(
                    season=latest_season,
                    league=league,
                )
                if created or season_league_team.teams.count() == 0:
                    season_league_team.teams.set(league_teams)

    def create_team_players(self, teams):
        """Create players for each team."""
        player_count = 0
        first_names = [
            'Michael', 'David', 'James', 'Robert', 'John', 'Thomas', 'Daniel', 'Matthew',
            'Christopher', 'Anthony', 'Sarah', 'Emma', 'Lisa', 'Anna', 'Jennifer', 'Maria',
            'Jessica', 'Laura', 'Michelle', 'Sandra'
        ]
        last_names = [
            'Schmidt', 'Mueller', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker',
            'Schulz', 'Hoffmann', 'Schroeder', 'Koch', 'Bauer', 'Richter', 'Wolf', 'Schaefer',
            'Hill', 'Graham', 'Thompson', 'Taylor'
        ]

        for team in teams:
            # Create 10 players per team
            num_players = 10
            for i in range(num_players):
                first_name = random.choice(first_names)
                last_name = random.choice(last_names)
                sex = random.choice([Person.MALE, Person.FEMALE])
                year_of_birth = random.randint(1990, 2010)

                person, _ = Person.objects.get_or_create(
                    first_name=first_name,
                    last_name=last_name,
                    defaults={
                        'sex': sex,
                        'year_of_birth': year_of_birth,
                    }
                )

                player, created = Player.objects.get_or_create(
                    person=person,
                    defaults={'pass_number': f"{team.id}{i:02d}"}
                )

                playerlist, created = Playerlist.objects.get_or_create(
                    team=team,
                    player=player,
                    defaults={
                        'jersey_number': (i % 100),
                        'joined_on': date.today(),
                    }
                )

                if created:
                    player_count += 1

        return player_count

    def create_demo_users(self):
        """Create demo user accounts with predefined credentials."""
        demo_accounts = [
            {
                'username': 'admin@demo.local',
                'email': 'admin@demo.local',
                'password': 'DemoAdmin123!',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'username': 'referee@demo.local',
                'email': 'referee@demo.local',
                'password': 'DemoRef123!',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'manager@demo.local',
                'email': 'manager@demo.local',
                'password': 'DemoMgr123!',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'user@demo.local',
                'email': 'user@demo.local',
                'password': 'DemoUser123!',
                'is_staff': False,
                'is_superuser': False,
            },
        ]

        for account in demo_accounts:
            user, created = User.objects.get_or_create(
                username=account['username'],
                defaults={
                    'email': account['email'],
                    'is_staff': account['is_staff'],
                    'is_superuser': account['is_superuser'],
                    'first_name': account['username'].split('@')[0].title(),
                }
            )
            if created:
                user.set_password(account['password'])
                user.save()

    def create_gamedays(self, seasons, leagues, teams):
        """Create sample gamedays with groups and games for the latest season."""
        if not seasons or not leagues or not teams:
            return 0

        latest_season = seasons[-1]
        gameday_count = 0
        now = timezone.now()
        admin_user = User.objects.filter(username='admin@demo.local').first()

        if not admin_user:
            return 0

        # Create 2 gamedays per league
        for league in leagues:
            for day_num in range(1, 3):
                gameday_date = now + timedelta(days=day_num * 7)
                gameday_name = f"{league.name} - Spieltag {day_num}"

                gameday, created = Gameday.objects.get_or_create(
                    season=latest_season,
                    league=league,
                    name=gameday_name,
                    defaults={
                        'date': gameday_date.date(),
                        'start': '10:00',
                        'status': Gameday.STATUS_PUBLISHED if day_num == 1 else Gameday.STATUS_DRAFT,
                        'author': admin_user,
                    }
                )

                if created:
                    gameday_count += 1
                    # Create games for this gameday
                    self.create_games_for_gameday(gameday, league, latest_season, teams)

        return gameday_count

    def create_games_for_gameday(self, gameday, league, season, teams):
        """Create sample games within a gameday."""
        if len(teams) < 2:
            return

        # Create 2 groups with alternating teams
        group_a_teams = teams[0::2][:3]  # Every other team, up to 3
        group_b_teams = teams[1::2][:3]  # Every other team, up to 3

        # Ensure we have at least 2 teams per group
        if len(group_a_teams) < 2:
            group_a_teams = teams[:2]
        if len(group_b_teams) < 2:
            group_b_teams = teams[2:4] if len(teams) >= 4 else [teams[0]]

        scheduled_times = ['10:00', '11:15', '12:30']
        game_counter = 0

        # Create round-robin games within each group
        for group_idx, group_teams in enumerate([group_a_teams, group_b_teams], 1):
            group_name = f"Gruppe {group_idx}"

            # Create or get LeagueGroup
            league_group, _ = LeagueGroup.objects.get_or_create(
                league=league,
                season=season,
                name=group_name
            )

            # Create games between teams in this group
            for i, home_team in enumerate(group_teams):
                for away_team in group_teams[i+1:]:
                    scheduled = scheduled_times[game_counter % len(scheduled_times)]

                    gameinfo, created = Gameinfo.objects.get_or_create(
                        gameday=gameday,
                        league_group=league_group,
                        defaults={
                            'scheduled': scheduled,
                            'field': (game_counter % 3) + 1,
                            'status': 'beendet' if gameday.status == Gameday.STATUS_PUBLISHED else 'Geplant',
                            'stage': f"Game {game_counter + 1}",
                            'standing': group_name,
                            'officials': random.choice([home_team, away_team]),
                        }
                    )

                    if created:
                        # Add game results
                        self.create_game_result(gameinfo, home_team, away_team)

                    game_counter += 1

    def create_game_result(self, gameinfo, home_team, away_team):
        """Create game results for home and away teams."""
        home_goals_fh = random.randint(0, 3)
        home_goals_sh = random.randint(0, 3)
        away_goals_fh = random.randint(0, 3)
        away_goals_sh = random.randint(0, 3)

        # Home team result
        Gameresult.objects.get_or_create(
            gameinfo=gameinfo,
            team=home_team,
            isHome=True,
            defaults={
                'fh': home_goals_fh,
                'sh': home_goals_sh,
                'pa': random.randint(6, 12),
            }
        )

        # Away team result
        Gameresult.objects.get_or_create(
            gameinfo=gameinfo,
            team=away_team,
            isHome=False,
            defaults={
                'fh': away_goals_fh,
                'sh': away_goals_sh,
                'pa': random.randint(6, 12),
            }
        )
