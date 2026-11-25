"""Resolve the free-text association values used by external games onto the
``gamedays.Association`` rows.

Single source of truth for the three places that have to understand those
strings: the ``association`` varchar→FK data migration, the external-game
import (``ExternalGameOfficialEntry``) and the self-service forms. The
production dump contains 21 distinct values but only 19 association rows exist
and none may be created, so the five values that have no row of their own are
aliased onto an existing one (user-fixed mapping).
"""

from gamedays.models import Association

# Free-text values that must map onto an existing association instead of
# raising (and instead of creating a new row).
ASSOCIATION_ALIASES = {
    "AFCVTH": "AFCVT",
    "Spielverbund Nord": "AFCVNORD",
    "Ausland": "OHNE",
    "Scrimmage": "OHNE",
    "Natio": "OHNE",
}


class UnknownAssociationError(ValueError):
    """Raised when a value matches no association abbreviation, alias or name."""


def resolve_association(value: str) -> Association:
    """Resolve ``value`` to an :class:`Association`.

    Order: exact abbreviation, then the alias map, then an exact
    case-insensitive name match (imports written with the long form, e.g.
    ``Hamburg``). Anything else raises :class:`UnknownAssociationError`, so a
    typo becomes a per-row error rather than a silent empty value.
    """
    normalized = (value or "").strip()
    if not normalized:
        raise UnknownAssociationError(f"Unbekannter Verband: {value}")

    association = Association.objects.filter(abbr=normalized).first()
    if association is not None:
        return association

    alias = ASSOCIATION_ALIASES.get(normalized)
    if alias is not None:
        association = Association.objects.filter(abbr=alias).first()
        if association is not None:
            return association

    association = Association.objects.filter(name__iexact=normalized).first()
    if association is not None:
        return association

    raise UnknownAssociationError(f"Unbekannter Verband: {value}")
