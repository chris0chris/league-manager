import { useRef, useState } from "react";

import type { GameLogEventInput, RosterPlayer } from "../../api/types";
import JerseyPicker, { jerseyAllowed, jerseyOptions } from "../JerseyPicker";
import { errorMessage } from "./errors";
import Sheet from "./Sheet";
import { yardsText, yardsValue } from "./yards";

/**
 * Events of one touchdown submission: the touchdown row alone. The extra
 * point is a separate entry once the try has been played (the tracking
 * screen asks for it), so the sheet never records a point that may not
 * happen.
 */
export function touchdownEvents(
  jersey: number | null,
  yards: number | null = null,
): GameLogEventInput[] {
  // A touchdown without a number is a team score (IFAF R 8-1-1): the row
  // names nobody rather than losing the six points.
  const event: GameLogEventInput = { name: "Touchdown" };
  if (jersey !== null) {
    event.player = jersey;
  }
  if (yards !== null) {
    // The distance is the play's detail; the score is the jersey's.
    event.payload = { yards };
    event.input = yardsText(yards);
  }
  return [event];
}

interface TouchdownSheetProps {
  /** Possession team as the API knows it (the write body's `team`). */
  teamName: string;
  /** Side of the possession team; the roster is filtered by it. */
  side: RosterPlayer["side"];
  /**
   * Both sides as loaded from `GET /api/game/<id>/roster`, `null` while the
   * request is still running. Until it settles the sheet shows a loading note
   * instead of guessing that the roster is empty.
   */
  roster: RosterPlayer[] | null;
  /** Only a fully checked game may call its roster "bestätigt". */
  passcheck?: boolean;
  /** Jerseys that already scored or moved the chains this game, newest first. */
  recent?: number[];
  /**
   * The yards from the spot to the goal line, i.e. the gain the touchdown is
   * worth (T4). The sheet pre-fills its yards field with it, so the row shows
   * the Raumgewinn even when the official only confirms.
   */
  gain?: number | null;
  /**
   * Writes the events and resolves once the server answered with the new log.
   * Rejects on failure — the sheet then stays open and shows the message.
   */
  onSubmit: (events: GameLogEventInput[]) => Promise<void>;
  /** Called after a successful write; the screen drops the sheet. */
  onClose: () => void;
}

/**
 * Touchdown entry: the scorer's jersey from the possession team's roster.
 * The extra point is not asked here; it is entered after the try.
 */
export default function TouchdownSheet({
  teamName,
  side,
  roster,
  passcheck = false,
  recent = [],
  gain = null,
  onSubmit,
  onClose,
}: TouchdownSheetProps) {
  const [jersey, setJersey] = useState<number | null>(null);
  // The remaining yards are the gain: starting from the spot, the ball has to
  // cross the goal line. Pre-filled, still editable — a return can score from
  // anywhere.
  const [yards, setYards] = useState(gain === null ? "" : String(gain));
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref, not state: a synchronous double tap both see `posting === false`
  // before React re-renders, and the second submit would resolve immediately.
  const saving = useRef(false);

  const players =
    roster === null ? [] : roster.filter((player) => player.side === side);
  const loading = roster === null;
  // "Ohne Nummer" is a valid entry: the score is the team's, the number is
  // the detail. A picked number still has to be on a confirmed roster.
  const ready =
    (jersey === null || jerseyAllowed(players, jersey, passcheck)) &&
    !posting &&
    !loading;
  const names = new Map(
    jerseyOptions(players).map((option) => [option.jersey, option.name]),
  );
  const chips = recent.filter((number) => !passcheck || names.has(number)).slice(0, 4);

  const save = async (): Promise<void> => {
    if (saving.current || !ready) {
      return;
    }
    saving.current = true;
    setPosting(true);
    setError(null);
    try {
      await onSubmit(touchdownEvents(jersey, yardsValue(yards)));
      onClose();
    } catch (failure) {
      saving.current = false;
      setPosting(false);
      setError(
        errorMessage(
          failure,
          "Der Touchdown konnte nicht gespeichert werden. Bitte erneut versuchen.",
        ),
      );
    }
  };

  return (
    <Sheet
      busy={posting}
      error={error}
      footer={
        <button
          className="startbtn"
          disabled={!ready}
          onClick={() => void save()}
          type="button"
        >
          {posting ? "Speichern …" : "Speichern"}
        </button>
      }
      onClose={onClose}
      title="Wer hat gepunktet?"
    >
      <p className="sheetnote">
        Touchdown {teamName}
        {passcheck ? " · bestätigter Kader" : ""}
      </p>

      {chips.length === 0 || loading ? null : (
        <JerseyPicker
          compact
          disabled={posting}
          groupLabel="Zuletzt"
          onChange={setJersey}
          players={chips.map((number) => ({
            side,
            jersey: number,
            name: names.get(number) ?? null,
          }))}
          value={jersey}
        />
      )}

      <div className="sheetfield">
        <label className="sheetlabel" htmlFor="touchdown-yards">
          Raumgewinn (Yards, optional)
        </label>
        <input
          autoComplete="off"
          className="sheetinput sheetinput-num"
          disabled={posting}
          id="touchdown-yards"
          inputMode="numeric"
          onChange={(event) => setYards(event.target.value)}
          pattern="[0-9]*"
          type="text"
          value={yards}
        />
      </div>

      <h3 className="sheetsection">
        {passcheck ? "Bestätigter Kader" : "Kader"}
      </h3>
      {loading ? (
        <p className="sheetnote" role="status">
          Kader lädt …
        </p>
      ) : (
        <JerseyPicker
          disabled={posting}
          onChange={setJersey}
          optionalLabel="Ohne Nummer"
          players={players}
          strict={passcheck}
          value={jersey}
        />
      )}
      {passcheck && !loading && players.length > 0 ? (
        <p className="sheetnote">Nur bestätigte Nummern.</p>
      ) : null}

    </Sheet>
  );
}
