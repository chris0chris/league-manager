# gamedays/services/ranking/engine.py

import pandas as pd

from gamedays.service.gameday_settings import (
    POINTS,
    PF,
    PA,
    DIFF,
)
from league_table.models import LeagueRuleset
from league_table.service.datatypes import LeagueConfig, LeagueConfigRuleset
from league_table.service.ranking.tiebreakers import TieBreaker, TIEBREAK_REGISTRY


class FinalRankingEngine:
    def __init__(self, games_with_result: pd.DataFrame, schedule: pd.DataFrame):
        self.games = games_with_result
        self.schedule = schedule

    def _winner(self, row):
        """Return the winning team's name for a finished game."""
        if row["points_home"] > row["points_away"]:
            return row["home"]
        elif row["points_home"] < row["points_away"]:
            return row["away"]
        return None  # handle draws safely

    def _loser(self, row):
        """Return the losing team's name."""
        if row["points_home"] > row["points_away"]:
            return row["away"]
        elif row["points_home"] < row["points_away"]:
            return row["home"]
        return None  # handle draws safely

    def compute_final_table(self) -> pd.DataFrame:
        """Compute final standings based on actual playoff results."""
        # ensure all games finished
        if not self.games[self.games["status"] != "beendet"].empty:
            return pd.DataFrame()

        final_standing = []

        # define the expected placement games
        placements = ["P1", "P3", "P5", "P7", "P9", "P10"]
        for place in placements:
            games = self.schedule[self.schedule["standing"] == place]
            if games.empty:
                continue

            if len(games) == 1:
                # only one game, use current logic
                result_row = games.iloc[0]
                winner = self._winner(result_row)
                loser = self._loser(result_row)
                if not winner or not loser:
                    continue
                final_standing.append(winner)
                final_standing.append(loser)
            else:
                # multiple games: use tie-breaker engine to decide order
                # assume `TieBreakerEngine` can rank a subset of games
                # For example, we rank the teams based on the aggregate pf/pa/points
                subset_games = self.games[
                    self.games["gameinfo"].isin(games["gameinfo"])
                ]
                # Build a mini-standings table
                mini_table = subset_games.groupby("team__name", as_index=False).agg(
                    {POINTS: "sum", PF: "sum", PA: "sum", "standing": "first"}
                )
                mini_table[DIFF] = mini_table[PF] - mini_table[PA]

                # Sort using your tie-breaker logic (replace with your actual tie-breaker engine)
                # TODO make dynamic
                tie_breaker = TieBreakerEngine(
                    LeagueRuleset.objects.first()
                )  # or whatever engine you already have
                mini_table_sorted = tie_breaker.rank(mini_table, games)

                # Add sorted teams to final_standing
                final_standing.extend(mini_table_sorted["team__name"].tolist())

        # if some teams are not in playoffs, add them at the end
        all_teams = self.games["team__name"].unique().tolist()
        missing = [t for t in all_teams if t not in final_standing]
        final_standing += missing

        # aggregate basic stats for presentation
        table = self.games.groupby("team__name", as_index=False).agg(
            {POINTS: "sum", PF: "sum", PA: "sum"}
        )
        table[DIFF] = table[PF] - table[PA]
        table.set_index("team__name", inplace=True)
        table = table.reindex(final_standing).reset_index()

        return table


class LeagueRankingEngine:
    def __init__(self, league_config: LeagueConfig):
        self.league_config = league_config

    def compute_initial_stats(self, df) -> pd.DataFrame:
        """Return all finished games for the season+league with league-aware scoring."""

        df["league_points"] = df.apply(self._compute_league_points, axis=1)

        df["games_played"] = df["fh"].fillna(0).apply(lambda x: 1 if x >= 0 else 0)

        # max_league_points column
        df["max_league_points"] = self._compute_max_points(df)

        # diff column
        df["pf"] = df["fh"].fillna(0) + df["sh"].fillna(0)
        df["wins"] = df.apply(lambda r: 1 if r["pf"] > r["pa"] else 0, axis=1)
        df["draws"] = df.apply(lambda r: 1 if r["pf"] == r["pa"] else 0, axis=1)
        df["losses"] = df.apply(lambda r: 1 if r["pf"] < r["pa"] else 0, axis=1)
        df["diff"] = df["pf"] - df["pa"]

        return df

    def apply_team_point_adjustments(self, df: pd.DataFrame) -> pd.DataFrame:
        adjustments = self.league_config.team_point_adjustments_map

        if not adjustments:
            return df

        for adj in adjustments:
            team_id = adj["id"]
            points_delta = int(adj["points"])
            field = adj["field"]  # usually "points"

            # Safety checks
            if field not in df.columns:
                raise ValueError(f"Invalid adjustment field '{field}'")

            # Apply adjustment
            df.loc[df["team_id"] == team_id, field] += points_delta

        return df

    def compute_league_table(self, games_with_results: pd.DataFrame) -> pd.DataFrame:
        """Aggregate all game results into one final league table."""
        df_games = self.compute_initial_stats(games_with_results)
        if df_games.empty:
            return pd.DataFrame()

        df_games = df_games.rename(
            columns={
                "team__description": "team__name",
                "gameinfo__standing": "standing",
            }
        )

        table = df_games.groupby("team_id", as_index=False).agg(
            {
                "team__name": "first",
                "league_points": "sum",
                "max_league_points": "sum",
                "wins": "sum",
                "draws": "sum",
                "losses": "sum",
                "pf": "sum",
                "pa": "sum",
                "diff": "sum",
                "games_played": "count",
                "standing": "first",
            }
        )
        table = self.apply_team_point_adjustments(table)

        table["league_quotient"] = (
            table["league_points"] / table["max_league_points"]
        ).round(self.league_config.ruleset.league_quotient_precision)

        return table

    def _compute_league_points(self, row):
        league_points = self.league_config.ruleset.league_points
        if row["pf"] > row["pa"]:
            return (
                league_points.points_win_same_league
                if row["league_id"] == row["opponent_league_id"]
                else league_points.points_win_other_league
            )
        elif row["pf"] == row["pa"]:
            return (
                league_points.points_draw_same_league
                if row["league_id"] == row["opponent_league_id"]
                else league_points.points_draw_other_league
            )
        else:
            return (
                league_points.points_loss_same_league
                if row["league_id"] == row["opponent_league_id"]
                else league_points.points_loss_other_league
            )

    def _compute_max_points(self, df):
        league_points = self.league_config.ruleset.league_points
        return (df["league_id"] == df["opponent_league_id"]).map(
            {
                True: league_points.max_points_same_league,
                False: league_points.max_points_other_league,
            }
        )


class TieBreakerEngine:
    """Executes a chain of tie-breakers based on a LeagueRuleset."""

    def __init__(self, ruleset: LeagueConfigRuleset):
        self.ruleset = ruleset
        self.tie_breakers = self._build_from_ruleset()

    def _build_from_ruleset(self):
        return [
            TieBreaker(
                key=step["key"],
                func=TIEBREAK_REGISTRY[step["key"]],
                ascending=step["is_ascending"],
            )
            for step in self.ruleset.tie_break_order
        ]

    def rank(self, standings_df: pd.DataFrame, games_df: pd.DataFrame) -> pd.DataFrame:
        games_df = games_df.fillna({"fh": 0, "sh": 0, "pa": 0})

        # Compute tiebreakers inside each standing group
        ranked_groups = []
        for standing, group_df in standings_df.groupby("standing"):
            ranked_groups.append(self._rank_group(group_df.copy(), games_df))

        result = pd.concat(ranked_groups, ignore_index=True)

        # Sort again by standing + rank to ensure global order
        result = result.sort_values(by=["standing", "rank"], ignore_index=True)

        return result

    # -------------------------------------------------------------------------
    # INTERNALS
    # -------------------------------------------------------------------------
    def _rank_group(self, df: pd.DataFrame, games_df: pd.DataFrame) -> pd.DataFrame:
        updated = []

        for points, tied_df in df.groupby("league_points"):
            tied_df = tied_df.copy()
            for tb in self.tie_breakers:
                if tb.key not in tied_df.columns:
                    tied_df[tb.key] = pd.NA

            # If only one team → no tie → no tiebreak needed
            if len(tied_df) == 1:
                tied_df["rank"] = None  # temp, set later
                updated.append(tied_df)
                continue

            # Apply tiebreakers to tied teams
            tied_df = self._apply_tiebreakers(tied_df, games_df)

            updated.append(tied_df)

        # Merge all subsets back into one group again
        merged = pd.concat(updated, ignore_index=True)

        # Sort inside the tied group
        sort_keys = [tb.key for tb in self.tie_breakers]
        asc_list = [tb.ascending for tb in self.tie_breakers]

        merged = merged.sort_values(by=sort_keys, ascending=asc_list, ignore_index=True)

        # Assign final ranks inside this standing group
        merged["rank"] = self._assign_ranks_in_group(merged)

        return merged

    def _apply_tiebreakers(
        self, df: pd.DataFrame, games_df: pd.DataFrame
    ) -> pd.DataFrame:
        tied_ids = df["team_id"].tolist()

        for tb in self.tie_breakers:
            # Compute only the tiebreakers that are actually in use
            df[tb.key] = tb.apply(df, games_df, tied_ids)

        return df

    def _assign_ranks_in_group(self, df: pd.DataFrame) -> pd.Series:
        """
        Assign ranks within a group:
        - Teams fully tied except for 'name_ascending' share a rank.
        - name_ascending orders them but does NOT break the tie.
        - Next rank skips exactly by number of teams above.
        """

        tiebreak_cols = [tb.key for tb in self.tie_breakers]

        # If last tiebreaker is name_ascending, it does NOT define unique ranking
        if tiebreak_cols and tiebreak_cols[-1] == "name_ascending":
            # Collapse: remove name_ascending from tuple
            collapse_cols = tiebreak_cols[:-1]
        else:
            collapse_cols = tiebreak_cols

        # Create a tuple defining "tie groups"
        df["_tb_tuple"] = df[collapse_cols].apply(lambda r: tuple(r.values), axis=1)

        # Assign collapsed-rank group numbers (1,2,3,...)
        # preserve ordering in df
        unique_tuples = list(dict.fromkeys(df["_tb_tuple"]))  # preserves order
        group_rank_map = {tpl: idx + 1 for idx, tpl in enumerate(unique_tuples)}

        df["_group_rank"] = df["_tb_tuple"].map(group_rank_map)

        # Now compute final rank = size-aware ranking (1,1,1,4 style)
        ranks = []
        current_rank = 1
        prev_group_rank = None

        for _, row in df.iterrows():
            group_rank = row["_group_rank"]

            if prev_group_rank is None:
                # first row always rank 1
                ranks.append(current_rank)
            elif group_rank != prev_group_rank:
                # new group → increase rank by number of teams in previous group
                current_rank = len([r for r in ranks if r == ranks[-1]]) + ranks[-1]
                ranks.append(current_rank)
            else:
                # same collapsed tiebreak group → same rank
                ranks.append(current_rank)

            prev_group_rank = group_rank

        df.drop(columns=["_tb_tuple", "_group_rank"], inplace=True)

        return pd.Series(ranks, index=df.index)

    def _assign_ranks2(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        # Columns used for checking if teams are fully tied
        tiebreak_keys = [tb.key for tb in self.tie_breakers]

        # Always include points as primary
        comparison_cols = ["league_points"] + tiebreak_keys

        # Create a "is_tied_group" identifier
        df["_tiebreak_group"] = df[comparison_cols].apply(tuple, axis=1)

        # If the last tie-breaker is name-based → grouped ranks
        last_tb_is_name = (
            len(self.tie_breakers) > 0 and self.tie_breakers[-1].key == "name_ascending"
        )

        df["rank"] = 0

        if last_tb_is_name:
            # Teams with same criteria → same rank
            current_rank = 1
            for _, group in df.groupby("_tiebreak_group", sort=False):
                df.loc[group.index, "rank"] = current_rank
                current_rank += len(group)  # next rank jumps by group size
        else:
            # Normal ranking: unique and sequential
            df["rank"] = range(1, len(df) + 1)

        return df.drop(columns=["_tiebreak_group"])

    def rank3(self, standings_df: pd.DataFrame, games_df: pd.DataFrame) -> pd.DataFrame:
        games_df = games_df.fillna({"fh": 0, "sh": 0, "pa": 0})

        # Ensure tie-breaker columns exist as placeholders (optional)
        for tb in self.tie_breakers:
            if tb.key not in standings_df.columns:
                standings_df[tb.key] = pd.NA

        def _resolve_tied_group(tied_df: pd.DataFrame) -> pd.DataFrame:
            tied = tied_df.copy().reset_index(drop=True)

            # If no tie, return directly
            if tied.shape[0] <= 1:
                return tied

            remaining = tied.copy()
            resolved = []

            for tb in self.tie_breakers:
                if remaining.shape[0] <= 1:
                    break

                # Compute current TB only for remaining group
                remaining[tb.key] = tb.apply(
                    remaining,
                    games_df,
                    remaining["team_id"].tolist(),
                )

                # Sort remaining for this TB
                remaining = remaining.sort_values(
                    by=tb.key, ascending=tb.ascending, ignore_index=True
                )

                # Split by this TB value
                groups = []
                vals = remaining[tb.key].tolist()
                block = [0]

                for i in range(1, len(vals)):
                    if vals[i] == vals[i - 1]:
                        block.append(i)
                    else:
                        groups.append(block)
                        block = [i]
                groups.append(block)

                new_remaining = []
                for g in groups:
                    sub = remaining.iloc[g].copy().reset_index(drop=True)
                    if len(sub) == 1:
                        resolved.append(sub)
                    else:
                        new_remaining.append(sub)

                if not new_remaining:
                    # all resolved
                    break

                remaining = pd.concat(new_remaining, ignore_index=True)

            # Add leftover unresolved teams (final order preserved)
            if not remaining.empty:
                resolved.append(remaining)

            # IMPORTANT: return single frame (no duplicates possible)
            return pd.concat(resolved, ignore_index=True)

        updated_rows = []

        # --- iterate per standing and per points (league_points) group, but resolve ties iteratively ---
        for group_name, group_df in standings_df.groupby("standing"):
            for points_value, tied_df in group_df.groupby("league_points"):
                tied_df = tied_df.reset_index(drop=True)

                # Only resolve ties if necessary
                if len(tied_df) > 1:
                    ordered_tied = _resolve_tied_group(tied_df)
                    updated_rows.append(ordered_tied)
                else:
                    updated_rows.append(tied_df)

        # Merge back and final global sort (standing + tie-break order)
        sorted_df = pd.concat(updated_rows, ignore_index=True)

        sort_keys = [tb.key for tb in self.tie_breakers]
        ascending_list = [tb.ascending for tb in self.tie_breakers]

        # Always include standing + primary league_points as base sort
        sorted_df = sorted_df.sort_values(
            by=["standing", "league_points"] + sort_keys,
            ascending=[True, False] + ascending_list,
            ignore_index=True,
        )

        # Assign ranks (your _assign_ranks can be used here)
        sorted_df = self._assign_ranks(sorted_df)

        return sorted_df

    def rank2(self, standings_df: pd.DataFrame, games_df: pd.DataFrame) -> pd.DataFrame:
        """Sort standings by points first, then apply tie-breakers only within tied groups."""

        games_df = games_df.fillna({"fh": 0, "sh": 0, "pa": 0})

        # Step 2: Prepare placeholders for tie-breaker columns
        for tb in self.tie_breakers:
            if tb.key not in standings_df.columns:
                standings_df[tb.key] = pd.NA  # placeholder, will fill later

        # Step 3: Go through each group (e.g. group/standing) and tied points subset
        updated_rows = []

        for group_name, group_df in standings_df.groupby("standing"):
            # For each points value that occurs more than once
            for points_value, tied_df in group_df.groupby("league_points"):
                if len(tied_df) <= 1:
                    # no tie → skip
                    updated_rows.append(tied_df)
                    continue

                # Compute tie-breaker columns only for tied teams
                tied_teams = tied_df["team_id"].tolist()

                for tb in self.tie_breakers:
                    tied_df[tb.key] = tb.apply(tied_df, games_df, tied_teams)

                # Now sort the tied group using configured tiebreakers
                sort_keys = [tb.key for tb in self.tie_breakers]
                ascending_list = [tb.ascending for tb in self.tie_breakers]

                tied_df = tied_df.sort_values(
                    by=sort_keys, ascending=ascending_list, ignore_index=True
                )
                updated_rows.append(tied_df)

        # Step 4: Merge all groups back together and re-sort globally by points (and tiebreakers)
        sorted_df = pd.concat(updated_rows, ignore_index=True)

        sort_keys = [tb.key for tb in self.tie_breakers]
        ascending_list = [tb.ascending for tb in self.tie_breakers]
        sorted_df = sorted_df.sort_values(
            by=["standing"] + sort_keys,
            ascending=[True] + ascending_list,
            ignore_index=True,
        )

        # sorted_df = self._assign_ranks(sorted_df)

        return sorted_df
