from factory.django import DjangoModelFactory

from officials.models import Official, OfficialLicense, OfficialLicenseHistory


class OfficialFactory(DjangoModelFactory):
    class Meta:
        model = Official

    first_name = 'default first'
    last_name = 'default last'


class OfficialLicenseFactory(DjangoModelFactory):
    class Meta:
        model = OfficialLicense


class OfficialLicenseHistoryFactory(DjangoModelFactory):
    class Meta:
        model = OfficialLicenseHistory
