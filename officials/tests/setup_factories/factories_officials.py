import factory

from factory.django import DjangoModelFactory

from officials.models import (
    Official,
    OfficialLicense,
    OfficialLicenseHistory,
    OfficialExternalGames,
)


class OfficialFactory(DjangoModelFactory):
    class Meta:
        model = Official

    first_name = "default first"
    last_name = "default last"


class OfficialLicenseFactory(DjangoModelFactory):
    class Meta:
        model = OfficialLicense

    id = factory.Sequence(lambda n: n + 1)  # Ensure unique ID
    name = factory.Faker("word")

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Use `get_or_create` to avoid duplicate records."""
        obj, _ = model_class.objects.get_or_create(**kwargs)
        return obj


class OfficialLicenseHistoryFactory(DjangoModelFactory):
    class Meta:
        model = OfficialLicenseHistory


class OfficialExternalGamesFactory(DjangoModelFactory):
    class Meta:
        model = OfficialExternalGames
