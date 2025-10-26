from abc import abstractmethod, ABC
from typing import TYPE_CHECKING

from django.forms import Form

if TYPE_CHECKING:
    from gamedays.views import GameinfoWizard


class WizardStepHandler(ABC):
    @abstractmethod
    def handle(self, wizard: "GameinfoWizard", form: Form):
        pass
