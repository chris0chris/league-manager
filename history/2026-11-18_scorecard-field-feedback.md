# Scorecard v2 + liveticker — scorer field feedback (2026-11-18)

## Problem

A scorer sent a list of field-level complaints after real games: the jersey pad showed one name on every
number without a passcheck, the play buttons and "Mehr" were redundant, a tap outside a sheet triggered the
button underneath, the QB stayed changed after a one-off pass, the interception return was entered in the
wrong field orientation, labels lacked the full situation (`1st & M · A4`), the extra-point flow could not be
undone cleanly and did not record misses, undo moved the focus to the other team, time entry needed extra
taps and scrolled the score out of view, halftime did not show the coin toss, and the final screen had a
fake dropdown chevron and a history that did not scroll.

## Solution

Six slices, each owning its own files so they could be built in parallel by codey/opencode workers, then
assembled into gh stack #2432 and squash-merged together; released as **v5.16.0**.

| PR | Branch | Content |
|---|---|---|
| #2429 | `sc/sheet-polish` | Backdrop tap = close (no ghost click); time entry focus/auto-advance; sticky score header; captain inputs without chevron; scrollable final history; halftime shows coin toss, directions and second-half possession |
| #2427 | `sc/number-entry` | Game roster serves names only for teams with a `PasscheckVerification` on the gameday; demo finals fixture gets distinct surnames; jersey pad coloured by the player's team (`--home` red / `--away` green) |
| #2428 | `sc/play-wizard` | Field position is the last wizard step and is called "Feldposition"; A/B preselected from the ball spot; default QB comes from the setup only; interception return entered in the pre-turnover orientation (B4 + 5 → next series at A9); `· A11` appended to play text (log + liveticker) |
| #2425 | `sc/event-labels` | `Feldposition 1st & M · A4`; missed extra point rendered in EventLog, liveticker and the legacy events table |
| #2430 | `sc/pat-and-undo` | Undo keeps the focus unless the undone row changed possession; undoing a TD closes the PAT prompt, undoing a try reopens it; TD row carries the yards gained; "nicht verwandelt" opens an incomplete-pass-like step and writes a value-0 try |
| #2426 | `sc/spielzug-button` | One large **Spielzug** button + `SpielzugSheet` (Pass/Run/Sack/Interception · Touchdown (Kurzform)/Turnover/1st Down/Safety/Challenge · "Spielphase": Overtime/Feldposition); "Mehr" and key 7 removed, key `S` opens Spielzug |

Missed-try contract (shared by #2430 and #2425): row `1-Extra-Punkt`/`2-Extra-Punkte`, **value 0**, input
`"nicht verwandelt · QB #n · Deflection #n"`, event payload `{missed: true, qb?, defense?: {player, deflection}}`.
Both write paths (`gamedays/service/gamelog.py`, `gameevents/service/projector.py`) store value 0.

Decided with the product owner: no separate note field (moving the field position last solves "I forget the
numbers"); Overtime and Feldposition live under "Spielphase" in the Spielzug sheet.

## Verification

- CI green on every PR (incl. `codecov/patch`), and per layer after stacking (1,298 scorecard_v2 tests at the top).
- Acceptance run on **demo.leaguesphere.app (v5.16.0)**, Playwright at 390×844 with touch, gameday
  "Scorecard v2 Testtag": **18/18 points PASS**, scorecard console clean.

## Known issues / follow-ups

- The roster gate checks only that a `PasscheckVerification` exists, not that it is valid; a verification
  with a broken snapshot still serves names. The original report said "kein gültiger Passcheck" — check the
  real game's verification before calling that bug closed.
- Old-app missed tries (value 0, no payload/input) still render as converted in the scorecard log, because
  `/api/gamelog` rows carry no `value`; liveticker and the events table handle them.
- Liveticker joins player and detail with ` - `, the scorecard with ` · `.
- Demo's passcheck roster API returned 500 for the finals gameday (external service, unused by the scorecard).
