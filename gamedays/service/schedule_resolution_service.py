from gamedays.models import Team, Gameinfo, Gameresult, Gameday
from gameday_designer.models import (
    ScheduleTemplate,
    TemplateUpdateRule,
    TemplateApplication,
)
from gamedays.service.model_wrapper import GamedayModelWrapper
from gamedays.service.placeholder_service import GamedayPlaceholderService
import logging

logger = logging.getLogger(__name__)


class GamedayScheduleResolutionService:
    def __init__(self, gameday_id: int):
        self.gameday_id = gameday_id
        self.gameday = Gameday.objects.get(pk=gameday_id)
        self.placeholder_service = GamedayPlaceholderService(gameday_id)
        self.template = self.placeholder_service.get_template()
        self.gmw = GamedayModelWrapper(gameday_id)

    def update_participants(self, finished_standing: str):
        """
        Updates dependent games based on a finished standing/stage.
        """
        if not self.template:
            logger.warning(f"No template found for gameday {self.gameday_id}")
            return

        # Find rules that depend on the stage that just finished
        rules = TemplateUpdateRule.objects.filter(
            template=self.template, pre_finished=finished_standing
        )

        for rule in rules:
            self._apply_rule(rule)

    def _apply_rule(self, rule: TemplateUpdateRule):
        # Find the Gameinfo object in this gameday that matches the slot
        # We match by field, stage, and standing
        target_gis = Gameinfo.objects.filter(
            gameday=self.gameday,
            field=rule.slot.field,
            stage=rule.slot.stage,
            standing=rule.slot.standing
        )

        if target_gis.count() == 0:
            logger.warning(f"Could not find target Gameinfo for rule {rule.id}")
            return

        if target_gis.count() > 1:
            logger.warning(
                f"Ambiguous match: found {target_gis.count()} Gameinfo objects for rule {rule.id} "
                f"(field={rule.slot.field}, stage={rule.slot.stage}, standing={rule.slot.standing}). "
                f"Skipping to avoid updating the wrong game."
            )
            return

        target_gi = target_gis.first()

        for team_rule in rule.team_rules.all():
            try:
                team_name = self.gmw.get_team_by(
                    place=team_rule.place,
                    standing=team_rule.standing,
                    points=team_rule.points,
                )
                team = Team.objects.get(name=team_name)

                if team_rule.role == "home":
                    self._update_gameresult(target_gi, team, True)
                elif team_rule.role == "away":
                    self._update_gameresult(target_gi, team, False)
                elif team_rule.role == "official":
                    if target_gi.officials != team:
                        target_gi.officials = team
                        target_gi.save()
            except (IndexError, Team.DoesNotExist, KeyError) as e:
                logger.warning(f"Error applying team rule {team_rule.id}: {str(e)}")

    def _update_gameresult(self, gi: Gameinfo, team: Team, is_home: bool):
        gameresult, created = Gameresult.objects.get_or_create(
            gameinfo=gi, isHome=is_home
        )
        if gameresult.team != team:
            gameresult.team = team
            gameresult.save()

    @classmethod
    def get_game_placeholder(cls, gameinfo_id: int, is_home: bool) -> str:
        return GamedayPlaceholderService.resolve_placeholder(gameinfo_id, is_home)
