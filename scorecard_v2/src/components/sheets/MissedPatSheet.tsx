import { useState } from "react";

import type { GameLogEventInput, RosterPlayer } from "../../api/types";
import JerseyPicker from "../JerseyPicker";
import QuarterbackPick from "../QuarterbackPick";
import { errorMessage } from "./errors";
import Sheet from "./Sheet";

/** The try whose result the official picked: one or two points attempted. */
export type MissedPatPoints = 1 | 2;

/**
 * A missed extra point as the event store takes it.
 *
 * The attempt is a game event even though it scores nothing: the jersey of the
 * intended receiver/runner, the quarterback and the defender (with Deflection
 * or Tackle) are the record the later statistics read. The row keeps the name
 * of the try it was — `1-Extra-Punkt`/`2-Extra-Punkte` — and says in
 * `payload.missed` that it is worth nothing; a value derived from the name
 * alone would score the miss (#field feedback).
 */
export function missedPatEvent({
  points,
  jersey = null,
  qb = null,
  defender = null,
  deflection = false,
}: {
  points: MissedPatPoints;
  /** The attempted receiver/runner, or nobody. */
  jersey?: number | null;
  qb?: number | null;
  defender?: number | null;
  deflection?: boolean;
}): GameLogEventInput {
  const parts = ["nicht verwandelt"];
  if (qb !== null) {
    parts.push(`QB #${qb}`);
  }
  if (defender !== null) {
    parts.push(deflection ? `Deflection #${defender}` : `Tackle #${defender}`);
  }
  const payload: Record<string, unknown> = { missed: true };
  if (qb !== null) {
    payload.qb = qb;
  }
  if (defender !== null) {
    payload.defense = { player: defender, deflection };
  }
  const event: GameLogEventInput = {
    name: points === 2 ? "2-Extra-Punkte" : "1-Extra-Punkt",
    input: parts.join(" · "),
    payload,
  };
  if (jersey !== null) {
    event.player = jersey;
  }
  return event;
}

interface MissedPatSheetProps {
  /** The scoring team's name (the try's team). */
  teamName: string;
  /** Its side, for the jersey grid and the quarterback memory. */
  side: RosterPlayer["side"];
  /** The other team's name, printed above its defence picker. */
  opponentName: string;
  /** Both sides as loaded from the API, `null` while the request runs. */
  roster: RosterPlayer[] | null;
  /** The try's quarterback, pre-selected like the pass sheet does. */
  lastQuarterback?: number | null;
  /**
   * The touchdown's scorer: he is usually the one the try aimed at, so his
   * number is pre-selected and can be cleared.
   */
  initialJersey?: number | null;
  onSubmit: (events: GameLogEventInput[]) => Promise<void>;
  onClose: () => void;
}

/**
 * "nicht verwandelt": the same facts as an incomplete pass, all optional.
 *
 * The result choice stays where it was (a failed try is a tap on the prompt);
 * this sheet only adds the detail a later statistics pass wants. Saving it
 * without touching anything is one tap.
 */
export default function MissedPatSheet({
  teamName,
  side,
  opponentName,
  roster,
  lastQuarterback = null,
  initialJersey = null,
  onSubmit,
  onClose,
}: MissedPatSheetProps) {
  const [points, setPoints] = useState<MissedPatPoints>(1);
  const [qb, setQb] = useState<number | null>(lastQuarterback);
  const [jersey, setJersey] = useState<number | null>(initialJersey);
  const [defender, setDefender] = useState<number | null>(null);
  const [deflection, setDeflection] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const players =
    roster === null ? [] : roster.filter((player) => player.side === side);
  const defenders =
    roster === null ? [] : roster.filter((player) => player.side !== side);

  const save = async (): Promise<void> => {
    if (posting) {
      return;
    }
    setPosting(true);
    setError(null);
    try {
      await onSubmit([
        missedPatEvent({ points, jersey, qb, defender, deflection }),
      ]);
      onClose();
    } catch (failure) {
      setPosting(false);
      setError(
        errorMessage(
          failure,
          "Der Extrapunkt konnte nicht gespeichert werden. Bitte erneut versuchen.",
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
          disabled={posting}
          onClick={() => void save()}
          type="button"
        >
          {posting ? "Speichern …" : "Nicht verwandelt speichern"}
        </button>
      }
      onClose={onClose}
      title={`Extrapunkt ${teamName} · nicht verwandelt`}
    >
      <p className="sheetnote">
        Der Versuch zählt nicht. Alle Angaben sind optional.
      </p>

      <h3 className="sheetsection">Versuch</h3>
      <div aria-label="Versuch" className="seg" role="group">
        {([1, 2] as MissedPatPoints[]).map((option) => (
          <button
            aria-pressed={points === option}
            className={points === option ? "sel" : undefined}
            disabled={posting}
            key={option}
            onClick={() => setPoints(option)}
            type="button"
          >
            {option === 1 ? "1 Punkt" : "2 Punkte"}
          </button>
        ))}
      </div>

      <h3 className="sheetsection">Quarterback (optional)</h3>
      <QuarterbackPick
        disabled={posting}
        onChange={setQb}
        roster={roster}
        side={side}
        value={qb}
      />

      <h3 className="sheetsection">
        Trikotnummer (Empfänger/Läufer, optional)
      </h3>
      <JerseyPicker
        disabled={posting}
        groupLabel="Trikotnummer Versuch"
        label="Trikot"
        onChange={setJersey}
        optionalLabel="Ohne Nummer"
        players={players}
        value={jersey}
      />

      <div aria-label="Deflection" className="seg" role="group">
        <button
          aria-pressed={deflection}
          className={deflection ? "sel" : undefined}
          disabled={posting}
          onClick={() => setDeflection((current) => !current)}
          type="button"
        >
          Deflection
        </button>
      </div>
      <h3 className="sheetsection">
        {deflection
          ? `Deflection ${opponentName} (optional)`
          : `Tackle ${opponentName} (optional)`}
      </h3>
      <JerseyPicker
        disabled={posting}
        groupLabel="Trikotnummer Defense"
        label="Defense"
        onChange={setDefender}
        optionalLabel="Ohne Nummer"
        players={defenders}
        value={defender}
      />
    </Sheet>
  );
}
