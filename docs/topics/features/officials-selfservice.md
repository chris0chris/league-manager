# Officials self-service duty management

**Status:** In development (branch `feat/officials-selfservice`)

Officials can now look after their own duties without a staff member: they log in
with their offd.de (Moodle) account, claim the `?` rows in `/officials/einsaetze/`
that belong to them, add themselves to a game that has no entry yet, and manage
their own "Spiele außerhalb der DFFL" entries in their profile — add, edit and
delete, including several rows at once. Staff keep full access to everything and
act on behalf of any official.

Nothing about the scorecard changes: the scorecard remains the authoritative
editor of internal assignments and the last write wins.

## What it changes

- **Einsätze list (`/officials/einsaetze/`)**: an official who is logged in sees
  their own rows highlighted, gets a "Mir zuordnen" action on unassigned rows
  whose typed name matches them, and can filter to "Nur meine Einträge". A
  Moodle login banner replaces the anonymous view; anonymous visitors keep the
  cached, read-only page they have today.
- **Neuer Einsatz**: "Einsatz nachtragen" lets an official put themselves on a
  game that has no entry for the chosen position (gameday → game → position).
- **Profil (`/officials/profile/<id>/gamelist/<season>/`)**: the owner (or staff)
  can add, edit and delete external games, and delete their own DFFL entries.
  External games are entered in a form with an association dropdown; several
  rows can be added in one submission ("Weitere Zeile hinzufügen").
- **Staff**: everything above for any official, plus "Zuordnung aufheben" on a
  mapped row (clears the official, keeps the typed name) and the extra fields
  `official`, `notification_date` and `reporter_name` in the external-game
  form.

## Permissions

| Visitor | Einsätze list | Claim a `?` row | Add assignment | External games | DFFL entry |
| --- | --- | --- | --- | --- | --- |
| Anonymous | read, obfuscated names, cached | → login | → login | read | read |
| Team account (Django user = team name) | read, own team's names revealed | no (no write access) | no | no | no |
| Moodle official | read, own rows highlighted and revealed | own matching rows only | only for themselves | own entries: add / edit / delete | own entries: delete |
| Staff | read, all names | any unassigned row, any official | any official | any official's entries | any entry |

A Moodle user is always fixed to their own official record: a posted
`official_id` is ignored for anyone who is not staff. Every write route
re-checks the target row's owner server-side, so posting another official's row
id changes nothing.

## Association of external games

`OfficialExternalGames.association` used to be free text and is now a foreign
key to `gamedays.Association` (`on_delete=PROTECT`, not nullable). The forms
offer a dropdown, the import resolves the same values through one shared
resolver, and a value that is not a known association is a per-row error instead
of a silent empty value.

The migration maps the 21 values that occur in production onto the 19 existing
association rows; **no new associations are created**:

| Production value | Association |
| --- | --- |
| `OHNE` | OHNE |
| `AFCVBB` | AFCVBB |
| `AFCVBW` | AFCVBW |
| `AFVBY` | AFVBY |
| `AFVH` | AFVH |
| `AFCVMV` | AFCVMV |
| `AFCVN` | AFCVN |
| `AFVS` | AFVS |
| `AFCVNRW` | AFCVNRW |
| `AFCVT`, `AFCVTH` | AFCVT |
| `AFCVSH` | AFCVSH |
| `AFVSA` | AFVSA |
| `AFCVHH` | AFCVHH |
| `AFCVNORD`, `Spielverbund Nord` | AFCVNORD |
| `AFCVRLP` | AFCVRLP |
| `AFCVSAA` | AFCVSAA |
| `Ausland`, `Scrimmage`, `Natio` | OHNE |

Name lookups (e.g. `Hamburg` for `AFCVHH`) still work case-insensitively for
imports written with the long form.

## Coexistence with the scorecard

The scorecard writes internal assignments (`GameOfficial`) directly. This
feature never locks or invalidates those rows; it refuses to create a *new* row
for a position that already has one, and deleting an internal entry from the
profile is a plain delete — if the scorecard is saved for that game afterwards it
may recreate an empty slot. For future games the delete confirmation says so.

## Where the code lives

- `officials/service/association_resolution.py` — the association resolver and
  alias map shared by migration, import and forms.
- `officials/selfservice.py` — permission gate and the self-service write views.
- `officials/forms_selfservice.py` — external-game form/formset and the
  add-assignment form.
- `officials/migrations/0017_officialexternalgames_association_fk.py` — the
  association migration (reversible).
