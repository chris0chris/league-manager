# gamedays/services/ranking/engine.py

import pandas as pd

from gamedays.service.gameday_settings import (
    FINISHED,
)
from league_table.service.datatypes import LeagueConfig, LeagueConfigRuleset
from league_table.service.ranking.tiebreakers import TieBreaker, TIEBREAK_REGISTRY


class TeamStatsEngine:
    def __init__(self, ruleset: LeagueConfigRuleset):
        self.ruleset = ruleset

    def build(self, games_df: pd.DataFrame) -> pd.DataFrame:
        df = self._compute_team_stats(games_df)

        grouped = df.groupby("team_id").agg(
            {
                "team__name": "first",
                "pf": "sum",
                "pa": "sum",
                "wins": "sum",
                "draws": "sum",
                "losses": "sum",
                "games_played": "sum",
                "win_points": "sum",
                "max_win_points": "sum",
                "standing": "first",
            }
        )

        grouped["diff"] = grouped["pf"] - grouped["pa"]
        grouped["win_quotient"] = (
            grouped["win_points"] / grouped["max_win_points"]
        ).fillna(0.0).round(self.ruleset.league_quotient_precision)

        return grouped.reset_index()

    def _compute_team_stats(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        lp = self.ruleset.league_points

        finished_mask = df["status"] == FINISHED
        win_mask = (df["pf"] > df["pa"]) & finished_mask
        draw_mask = (df["pf"] == df["pa"]) & finished_mask
        loss_mask = (df["pf"] < df["pa"]) & finished_mask

        df["wins"] = win_mask.astype(int)
        df["draws"] = draw_mask.astype(int)
        df["losses"] = loss_mask.astype(int)
        df["games_played"] = finished_mask.astype(int)
        df["win_points"] = (
            win_mask * lp.points_win_same_league
            + draw_mask * lp.points_draw_same_league
            + loss_mask * lp.points_loss_same_league
        )
        df["max_win_points"] = finished_mask * lp.max_points_same_league

        return df


class FinalRankingEngine:
    def __init__(self, league_config_ruleset: LeagueConfigRuleset):
        self.league_config_ruleset = league_config_ruleset

    def compute_final_table(self, games: pd.DataFrame) -> pd.DataFrame:
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

            tie_breaker = TieBreakerEngine(self.league_config_ruleset)
            mini_table_sorted = tie_breaker.rank_by_games(local_games)

            final_standing.extend(mini_table_sorted["team_id"].tolist())

        # if some teams are not in playoffs, add them at the end
        all_teams = games["team_id"].unique().tolist()
        missing = [t for t in all_teams if t not in final_standing]
        final_standing += missing

        # aggregate basic stats for presentation
        table = TeamStatsEngine(self.league_config_ruleset).build(games)
        table = table.set_index("team_id").reindex(final_standing).reset_index()
        table["rank"] = range(1, len(table) + 1)
        table = table.rename(columns={"win_quotient": "win_quotient"})
        table["standing"] = "Finalrunde"

        return table


class LeagueRankingEngine:
    def __init__(self, league_config: LeagueConfig):
        self.league_config = league_config

    def compute_league_specific_stats(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        lp = self.league_config.ruleset.league_points
        mask_finished = df["status"] == FINISHED

        same_league = df["league_id"] == df["opponent_league_id"]

        df["win_points"] = (
            (df["pf"] > df["pa"])
            * mask_finished
            * same_league.map(
                {True: lp.points_win_same_league, False: lp.points_win_other_league}
            )
            + (df["pf"] == df["pa"])
            * mask_finished
            * same_league.map(
                {True: lp.points_draw_same_league, False: lp.points_draw_other_league}
            )
            + (df["pf"] < df["pa"])
            * mask_finished
            * same_league.map(
                {True: lp.points_loss_same_league, False: lp.points_loss_other_league}
            )
        )

        df["max_win_points"] = same_league.map(
            {
                True: lp.max_points_same_league,
                False: lp.max_points_other_league,
            }
        )

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
        if games_with_results.empty:
            return pd.DataFrame()

        df_games = games_with_results.rename(
            columns={
                "team__description": "team__name",
                "gameinfo__standing": "standing",
                "gameinfo__status": "status",
            }
        )

        if self.league_config.group_by_leagues:
            df_games["standing"] = df_games["league__name"]

        team_stats = TeamStatsEngine(self.league_config.ruleset).build(df_games)
        del team_stats["win_points"]
        del team_stats["max_win_points"]

        league_stats = self.compute_league_specific_stats(df_games)

        league_agg = league_stats.groupby("team_id", as_index=False).agg(
            {
                "win_points": "sum",
                "max_win_points": "sum",
            }
        )

        table = team_stats.merge(
            league_agg,
            on="team_id",
            how="left",
        )

        table = self.apply_team_point_adjustments(table)

        table["win_quotient"] = (table["win_points"] / table["max_win_points"]).fillna(0.0).round(
            self.league_config.ruleset.league_quotient_precision
        )

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

    def rank_by_games(self, games_df: pd.DataFrame) -> pd.DataFrame:
        stats = TeamStatsEngine(self.ruleset).build(games_df)
        return self.rank(stats, games_df)

    # -------------------------------------------------------------------------
    # INTERNALS
    # -------------------------------------------------------------------------
    def _rank_group(self, df: pd.DataFrame, games_df: pd.DataFrame) -> pd.DataFrame:
        updated = []

        for points, tied_df in df.groupby("win_quotient", dropna=False):
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
