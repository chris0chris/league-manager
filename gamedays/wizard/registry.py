from . import FIELD_GROUP_STEP, GAMEDAY_FORMAT_STEP, GAMEINFO_STEP
from . import FieldGroupStepHandler, GamedayFormatStepHandler, GameinfoStepHandler

WIZARD_STEP_HANDLER_MAP = {
    FIELD_GROUP_STEP: FieldGroupStepHandler(),
    GAMEDAY_FORMAT_STEP: GamedayFormatStepHandler(),
    GAMEINFO_STEP: GameinfoStepHandler(),
}
