from abc import abstractmethod, ABC
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from gamedays.views import GameinfoWizard


class WizardStepHandler(ABC):
    @abstractmethod
    def handle_form(self, wizard: "GameinfoWizard", form, data):
        pass

    @abstractmethod
    def handle_process_step(self, wizard: "GameinfoWizard", form):
        pass
