# gamedays/services/ranking/engine.py

import pandas as pd

from gamedays.service.gameday_settings import (
    POINTS,
    PF,
    PA,
    DIFF,
    FINISHED,
)
from league_table.service.datatypes import LeagueConfig, LeagueConfigRuleset
from league_table.service.ranking.tiebreakers import TieBreaker, TIEBREAK_REGISTRY


class FinalRankingEngine:
    def __init__(self, league_config_ruleset: LeagueConfigRuleset):
        self.league_config_ruleset = league_config_ruleset

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

    def compute_final_table(self, games: pd.DataFrame, schedule: pd.DataFrame) -> pd.DataFrame:
        """Compute final standings based on actual playoff results."""
        # ensure all games finished
        if not games[games["status"] != "beendet"].empty:
            return pd.DataFrame()

        final_standing = []

        # define the expected placement games
        placements = ["P1", "P3", "P5", "P7", "P9", "P10"]
        for place in placements:
            local_games = games[games["standing"] == place]
            if local_games.empty:
                continue

            if len(local_games) == 1:
                # only one game, use current logic
                result_row = local_games.iloc[0]
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
                subset_games = local_games[
                    local_games["gameinfo"].isin(local_games["gameinfo"])
                ]
                # Build a mini-standings table
                mini_table = subset_games.groupby("team__name", as_index=False).agg(
                    {POINTS: "sum", PF: "sum", PA: "sum", "standing": "first"}
                )
                mini_table[DIFF] = mini_table[PF] - mini_table[PA]
                mini_table["league_quotient"] = mini_table[POINTS]


                # Sort using your tie-breaker logic (replace with your actual tie-breaker engine)
                tie_breaker = TieBreakerEngine(
                    self.league_config_ruleset
                )  # or whatever engine you already have
                mini_table_sorted = tie_breaker.rank(mini_table, local_games)

                # Add sorted teams to final_standing
                final_standing.extend(mini_table_sorted["team__name"].tolist())

        # if some teams are not in playoffs, add them at the end
        all_teams = games["team__name"].unique().tolist()
        missing = [t for t in all_teams if t not in final_standing]
        final_standing += missing

        # aggregate basic stats for presentation
        table = games.groupby("team__name", as_index=False).agg(
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
        """Return finished games for the season+league with league-aware scoring."""

        lp = self.league_config.ruleset.league_points
        mask_finished = df["gameinfo__status"] == FINISHED

        # diff column
        df["pf"] = df["fh"].fillna(0) + df["sh"].fillna(0)

        # ---------------------------------------------------------------------
        # Vectorized outcomes
        # ---------------------------------------------------------------------
        win_mask = df["pf"] > df["pa"]
        draw_mask = df["pf"] == df["pa"]
        loss_mask = df["pf"] < df["pa"]

        same_league = df["league_id"] == df["opponent_league_id"]

        # ---------------------------------------------------------------------
        # Vectorized league points
        # ---------------------------------------------------------------------
        df["league_points"] = (
            win_mask * mask_finished * same_league.map({True: lp.points_win_same_league,
                                         False: lp.points_win_other_league})
            +
            draw_mask * mask_finished * same_league.map({True: lp.points_draw_same_league,
                                         False: lp.points_draw_other_league})
            +
            loss_mask * mask_finished * same_league.map({True: lp.points_loss_same_league,
                                         False: lp.points_loss_other_league})
        )

        # ---------------------------------------------------------------------
        # Games played (only finished)
        # ---------------------------------------------------------------------
        df["games_played"] = mask_finished.astype("Int64")

        # ---------------------------------------------------------------------
        # Max league points per match (vectorized)
        # ---------------------------------------------------------------------
        df["max_league_points"] = same_league.map(
            {
                True: lp.max_points_same_league,
                False: lp.max_points_other_league,
            }
        )

        # ---------------------------------------------------------------------
        # Wins / Draws / Losses (only for finished games)
        # ---------------------------------------------------------------------
        df["wins"] = (win_mask & mask_finished).astype("Int64")
        df["draws"] = (draw_mask & mask_finished).astype("Int64")
        df["losses"] = (loss_mask & mask_finished).astype("Int64")

        # ---------------------------------------------------------------------
        # Diff
        # ---------------------------------------------------------------------
        df["diff"] = df["pf"] - df["pa"]

        return df

    def apply_team_point_adjustments(self, df: pd.DataFrame) -> pd.DataFrame:
        adjustments = self.league_config.team_point_adjustments_map

        if not adjustments:
            return df

        for adj in adjustments:
            team_id = adj["id"]
            points_delta = int(adj["points"])
            field = adj["field"]

            if field not in df.columns:
                raise ValueError(f"Invalid adjustment field '{field}'")

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
                "gameinfo__status": "status",
            }
        )

        if self.league_config.group_by_leagues:
            df_games['standing'] = df_games["league__name"]

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
                "games_played": "sum",
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

    def rank(self, games_with_results: pd.DataFrame):
        table = self.compute_league_table(games_with_results)
        tb_engine = TieBreakerEngine(self.league_config.ruleset)
        return tb_engine.rank(table, games_with_results)


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

        for points, tied_df in df.groupby("league_quotient"):
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
