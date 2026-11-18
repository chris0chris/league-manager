import { useEffect, useId, useRef, useState } from "react";

import type { GameLogEventInput, RosterPlayer } from "../../api/types";
import { FIELD_LENGTH, MIDFIELD, spotText } from "../../app/drive";
import { spotValue } from "./FieldPositionSheet";
import JerseyPicker, { jerseyOptions } from "../JerseyPicker";
import { errorMessage } from "./errors";
import Sheet from "./Sheet";
import { yardsText, yardsValue } from "./yards";

/** Which series/time entry the sheet is showing. */
export type SeriesMode =
  | "first"
  | "turnover"
  | "interception"
  | "time"
  | "timeout";

interface ModeInfo {
  title: string;
  /** Wire event name the server expects. */
  event: string;
  /** First Down and Interception may name a player, Turnover never does. */
  jersey: boolean;
}

const MODES: Record<SeriesMode, ModeInfo> = {
  first: { title: "First Down", event: "First Down", jersey: true },
  turnover: { title: "Turnover", event: "Turnover", jersey: false },
  interception: { title: "Interception", event: "Interception", jersey: true },
  time: { title: "Spielzeit", event: "Spielzeit", jersey: false },
  timeout: { title: "Auszeit", event: "Auszeit", jersey: false },
};

export function isTimeMode(mode: SeriesMode): boolean {
  return mode === "time" || mode === "timeout";
}

/** Largest minutes value the input allows; both clocks are mm:ss. */
export function maxMinutes(): number {
  return 59;
}

/** Digits only, at most two of them. */
export function clockDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 2);
}

/**
 * Validation for the two time fields, in the sheet's language.
 *
 * An empty field is a zero: an official who enters only minutes means
 * "mm:00", and one who enters only seconds means "00:ss" (the operator's call
 * on game 9316). Only both fields empty is an unfinished entry — the server
 * would otherwise store an empty text as the row's input.
 */
export function timeError(
  mode: SeriesMode,
  minutes: string,
  seconds: string,
): string | null {
  if (minutes === "" && seconds === "") {
    return "Bitte Minuten und Sekunden angeben.";
  }
  if (Number(minutes) > maxMinutes()) {
    return mode === "time"
      ? "Die Spielzeit muss zwischen 00:00 und 59:59 liegen."
      : "Die Auszeit muss zwischen 00:00 und 59:59 liegen.";
  }
  if (Number(seconds) > 59) {
    return "Sekunden müssen zwischen 0 und 59 liegen.";
  }
  return null;
}

/**
 * The `input` text of a time row: the remaining game time as `mm:ss`.
 *
 * Both Spielzeit and Auszeit store *when* in the game they happened, so the
 * log, the timeout history and the old app's rows all read the same way. A
 * duration would answer "how long", not "when" — the question the officials
 * have to settle with the teams.
 */
export function clockInput(minutes: string, seconds: string): string {
  return `${(minutes === "" ? "0" : minutes).padStart(2, "0")}:${(
    seconds === "" ? "0" : seconds
  ).padStart(2, "0")}`;
}

/**
 * Payload of a non-time series entry; `Turnover` never names a player.
 *
 * A first down may carry the yards that moved the chains — the detail the
 * ticker and a later statistics pass read. `payload.yards` is the record,
 * `input` the text the log shows.
 */
export function seriesEvent(
  mode: SeriesMode,
  jersey: number | null,
  yards: number | null = null,
): GameLogEventInput {
  const { event, jersey: allowsJersey } = MODES[mode];
  const payload: GameLogEventInput =
    allowsJersey && jersey !== null
      ? { name: event, player: jersey }
      : { name: event };
  if (mode === "first" && yards !== null) {
    payload.payload = { yards };
    payload.input = yardsText(yards);
  }
  return payload;
}

/**
 * One interception, with where the return ended.
 *
 * R 5-1-1 puts the new series at the dead-ball spot, so the entry has to carry
 * it: without it the engine falls back to the own 5 (a touchback - correct for
 * a catch in the end zone, wrong for a 30-yard return). The spot is optional
 * because a lower-league operator may only know "we have the ball"; the return
 * yards are optional statistics and never move the ball.
 */
export function interceptionEvent(
  jersey: number | null,
  deadBall: number | null,
  returnYards: number | null,
): GameLogEventInput {
  const event: GameLogEventInput = { name: "Interception" };
  if (jersey !== null) {
    event.player = jersey;
  }
  const payload: Record<string, unknown> = {};
  if (deadBall !== null) {
    payload.deadBall = deadBall;
  }
  if (returnYards !== null) {
    payload.returnYards = returnYards;
  }
  if (Object.keys(payload).length > 0) {
    event.payload = payload;
  }
  const detail: string[] = [];
  if (deadBall !== null) {
    detail.push(`bis ${spotText(deadBall)}`);
  }
  if (returnYards !== null) {
    detail.push(`${returnYards} Yards Return`);
  }
  if (detail.length > 0) {
    event.input = detail.join(" · ");
  }
  return event;
}

/** Payload of a Spielzeit/Auszeit entry. */
export function timeEvent(
  mode: SeriesMode,
  minutes: string,
  seconds: string,
): GameLogEventInput {
  return { name: MODES[mode].event, input: clockInput(minutes, seconds) };
}

interface SeriesSheetProps {
  mode: SeriesMode;
  /** Possession team — the side the entry is recorded for. */
  teamName: string;
  /** The other team; the defender of an interception. */
  opponentName: string;
  /** Side of the possession team. */
  side: RosterPlayer["side"];
  /**
   * Both sides as loaded from `GET /api/game/<id>/roster`, `null` while the
   * request is still running.
   */
  roster: RosterPlayer[] | null;
  /**
   * Writes the events and resolves once the server answered with the new log.
   * Rejects on failure — the sheet then stays open and shows the message.
   */
  onSubmit: (events: GameLogEventInput[]) => Promise<void>;
  onClose: () => void;
  /** Timeouts already recorded, for the history under the Auszeit fields. */
  timeouts?: TimeoutRecord[];
  /** The definition's timeouts per half (`timeouts.per_half`). */
  perHalf?: number;
  /** The half the entry belongs to. */
  half?: number;
}

/** One recorded Auszeit as the history lists it. */
export interface TimeoutRecord {
  team: string;
  half: number;
  /** The remaining game time the entry stored (`mm:ss`). */
  time: string;
}

/**
 * One sheet for the five series and time entries.
 *
 * An interception is credited to the **defender** — the team that did not have
 * the ball — because the defense statistics read the row's team as the team
 * that made the play. The jersey list therefore comes from the opponent's
 * roster and the write payload names the opponent, not the passer.
 */
export default function SeriesSheet({
  mode,
  teamName,
  opponentName,
  side,
  roster,
  onSubmit,
  onClose,
  timeouts = [],
  perHalf = 2,
  half = 1,
}: SeriesSheetProps) {
  const info = MODES[mode];
  const time = isTimeMode(mode);
  const minutesId = useId();
  const secondsId = useId();
  const yardsId = useId();
  const deadBallId = useId();
  const returnId = useId();

  const [jersey, setJersey] = useState<number | null>(null);
  const [yards, setYards] = useState("");
  /** Where the interception's return ended (own-goal-based spot). */
  const [deadBallSide, setDeadBallSide] = useState<"A" | "B">("A");
  const [deadBallYards, setDeadBallYards] = useState("");
  const [returnYards, setReturnYards] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [touched, setTouched] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // See TouchdownSheet: two synchronous taps must not both reach onSubmit.
  const saving = useRef(false);
  const minutesRef = useRef<HTMLInputElement>(null);
  const secondsRef = useRef<HTMLInputElement>(null);

  // The clock is the entry the official almost always opens this sheet for:
  // start in the minutes field, with its (usually empty) value selected, and
  // never let that focus scroll the board away behind the sheet.
  useEffect(() => {
    if (!time) {
      return;
    }
    minutesRef.current?.focus({ preventScroll: true });
    minutesRef.current?.select();
  }, [time]);

  /** A tap on a clock field replaces its digits instead of inserting beside them. */
  const selectClock = (event: { currentTarget: HTMLInputElement }): void => {
    event.currentTarget.select();
  };

  const intercepts = mode === "interception";
  const jerseySide: RosterPlayer["side"] = intercepts
    ? side === "home"
      ? "away"
      : "home"
    : side;
  const displayTeam = intercepts ? opponentName : teamName;

  const players =
    roster === null
      ? []
      : roster.filter((player) => player.side === jerseySide);
  const options = jerseyOptions(players);
  const loading = roster === null;
  const validation = time ? timeError(mode, minutes, seconds) : null;
  const deadBallLine = spotValue(deadBallYards);
  const deadBallInvalid =
    intercepts &&
    deadBallLine !== null &&
    (deadBallLine < 0 || deadBallLine > MIDFIELD);
  const deadBall =
    deadBallLine === null
      ? null
      : Math.round(
          (deadBallSide === "A" ? deadBallLine : FIELD_LENGTH - deadBallLine) * 10,
        ) / 10;
  const ready = !posting && validation === null && !deadBallInvalid;

  const save = async (): Promise<void> => {
    if (saving.current || !ready) {
      return;
    }
    saving.current = true;
    setPosting(true);
    setError(null);
    try {
      await onSubmit(
        time
          ? [timeEvent(mode, minutes, seconds)]
          : intercepts
            ? [
                interceptionEvent(
                  jersey,
                  deadBall,
                  yardsValue(returnYards),
                ),
              ]
            : [seriesEvent(mode, jersey, yardsValue(yards))],
      );
      onClose();
    } catch (failure) {
      saving.current = false;
      setPosting(false);
      setError(
        errorMessage(
          failure,
          "Der Eintrag konnte nicht gespeichert werden. Bitte erneut versuchen.",
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
      title={info.title}
    >
      <p className="sheetnote">{displayTeam}</p>

      {time ? (
        <div className="timefields">
          <div className="sheetfield">
            <label className="sheetlabel" htmlFor={minutesId}>
              Minuten
            </label>
            <input
              autoComplete="off"
              className="sheetinput sheetinput-clock"
              disabled={posting}
              id={minutesId}
              inputMode="numeric"
              maxLength={2}
              onChange={(event) => {
                const digits = clockDigits(event.target.value);
                setMinutes(digits);
                setTouched(true);
                // Two digits are the whole minutes field: hand over to seconds
                // so the official never has to reach for the second box.
                if (digits.length === 2) {
                  secondsRef.current?.focus({ preventScroll: true });
                }
              }}
              onClick={selectClock}
              onFocus={selectClock}
              pattern="[0-9]*"
              placeholder={mode === "time" ? "00" : "0"}
              ref={minutesRef}
              type="text"
              value={minutes}
            />
          </div>
          <span aria-hidden="true" className="timesep">
            :
          </span>
          <div className="sheetfield">
            <label className="sheetlabel" htmlFor={secondsId}>
              Sekunden
            </label>
            <input
              autoComplete="off"
              className="sheetinput sheetinput-clock"
              disabled={posting}
              id={secondsId}
              inputMode="numeric"
              maxLength={2}
              onChange={(event) => {
                setSeconds(clockDigits(event.target.value));
                setTouched(true);
              }}
              onClick={selectClock}
              onFocus={selectClock}
              pattern="[0-9]*"
              placeholder="00"
              ref={secondsRef}
              type="text"
              value={seconds}
            />
          </div>
        </div>
      ) : null}

      {time ? (
        <p className="sheetnote">
          {mode === "time"
            ? "Restliche Spielzeit im laufenden Spiel – mm:ss."
            : "Restliche Spielzeit, als die Auszeit genommen wurde – mm:ss."}
        </p>
      ) : null}

      {touched && validation !== null ? (
        <p className="sheetwarn" role="alert">
          {validation}
        </p>
      ) : null}

      {!time && mode === "first" ? (
        <div className="sheetfield">
          <label className="sheetlabel" htmlFor={yardsId}>
            Raumgewinn (Yards, optional)
          </label>
          <input
            autoComplete="off"
            className="sheetinput sheetinput-num"
            disabled={posting}
            id={yardsId}
            inputMode="numeric"
            onChange={(changeEvent) => setYards(changeEvent.target.value)}
            pattern="[0-9]*"
            type="text"
            value={yards}
          />
        </div>
      ) : null}

      {!time && info.jersey ? (
        <>
          <h3 className="sheetsection">
            {intercepts
              ? "Trikotnummer Verteidiger (optional)"
              : "Trikotnummer (optional)"}
          </h3>
          {loading ? (
            <p className="sheetnote" role="status">
              Kader lädt …
            </p>
          ) : options.length === 0 ? (
            <p className="sheetnote">
              Kein Kader geladen – der Eintrag wird ohne Nummer gespeichert.
            </p>
          ) : (
            <JerseyPicker
              disabled={posting}
              groupLabel={
                intercepts
                  ? "Trikotnummer Verteidiger (optional)"
                  : "Trikotnummer (optional)"
              }
              label="Trikot"
              onChange={setJersey}
              optionalLabel="Ohne Nummer"
              players={players}
              value={jersey}
            />
          )}
        </>
      ) : null}

      {mode === "turnover" ? (
        <p className="sheetnote">
          Turnover {teamName}. Der Ballbesitz wechselt im Spielverlauf.
        </p>
      ) : null}

      {intercepts ? (
        <>
          <h3 className="sheetsection">Ballbesitz ab (optional)</h3>
          <div aria-label="Feldhälfte" className="seg" role="group">
            <button
              aria-pressed={deadBallSide === "A"}
              className={deadBallSide === "A" ? "sel" : undefined}
              disabled={posting}
              onClick={() => setDeadBallSide("A")}
              type="button"
            >
              A · eigene
            </button>
            <button
              aria-pressed={deadBallSide === "B"}
              className={deadBallSide === "B" ? "sel" : undefined}
              disabled={posting}
              onClick={() => setDeadBallSide("B")}
              type="button"
            >
              B · gegnerische
            </button>
          </div>
          <div className="sheetfield">
            <label className="sheetlabel" htmlFor={deadBallId}>
              Yardlinie, wo der Return endete (0–25)
            </label>
            <input
              autoComplete="off"
              className="sheetinput sheetinput-num"
              disabled={posting}
              id={deadBallId}
              inputMode="decimal"
              onChange={(changeEvent) => setDeadBallYards(changeEvent.target.value)}
              pattern="[0-9.,]*"
              type="text"
              value={deadBallYards}
            />
          </div>
          {deadBallInvalid ? (
            <p className="sheetwarn" role="alert">
              Die Yardlinie liegt zwischen 0 und 25.
            </p>
          ) : (
            <p className="sheetnote">
              Ohne Angabe beginnt der neue Angriff an der eigenen 5 (Touchback).
              {deadBall === null ? "" : ` Ballbesitz ab ${spotText(deadBall)}.`}
            </p>
          )}
          <div className="sheetfield">
            <label className="sheetlabel" htmlFor={returnId}>
              Return-Yards (optional, nur Statistik)
            </label>
            <input
              autoComplete="off"
              className="sheetinput sheetinput-num"
              disabled={posting}
              id={returnId}
              inputMode="numeric"
              onChange={(changeEvent) => setReturnYards(changeEvent.target.value)}
              pattern="[0-9]*"
              type="text"
              value={returnYards}
            />
          </div>
          <p className="sheetnote">
            Interception durch {opponentName}. Der Ballbesitz wechselt im
            Spielverlauf zu {opponentName}.
          </p>
        </>
      ) : null}

      {mode === "timeout" ? (
        <TimeoutHistory
          half={half}
          perHalf={perHalf}
          teams={[teamName, opponentName]}
          timeouts={timeouts}
        />
      ) : null}
    </Sheet>
  );
}

/**
 * How many timeouts each side has taken, and when — the facts the officials
 * have to settle with the teams ("you already took one in the first half").
 *
 * Read from the log rows, never counted server-side: a deleted row disappears
 * from the history the moment it is undone.
 */
export function TimeoutHistory({
  teams,
  timeouts,
  half = 1,
  perHalf = 2,
}: {
  teams: string[];
  timeouts: TimeoutRecord[];
  half?: number;
  perHalf?: number;
}) {
  return (
    <section aria-label="Bisherige Auszeiten" className="timeouthistory">
      <h3 className="sheetsection">Bisherige Auszeiten</h3>
      {teams.map((team) => {
        const taken = timeouts.filter((entry) => entry.team === team);
        const thisHalf = taken.filter((entry) => entry.half === half).length;
        const exhausted = thisHalf >= perHalf;
        return (
          <div key={team}>
            <p className="timeoutteam">
              <span className="timeoutname">{team}</span>{" "}
              {taken.length === 0
                ? "– noch keine"
                : taken
                    .map(
                      (entry) =>
                        `${entry.half === 2 ? "2." : "1."} HZ ${entry.time}`,
                    )
                    .join(" · ") +
                  ` (${taken.length} ${
                    taken.length === 1 ? "Auszeit" : "Auszeiten"
                  })`}
            </p>
            <p className={exhausted ? "sheetwarn" : "sheetnote"} role="status">
              {thisHalf} von {perHalf} in dieser Halbzeit
              {exhausted
                ? " – eine weitere Auszeit ist die Strafe „Auszeit ohne verbleibende Auszeit“ (5 Yards). Sie kann trotzdem erfasst werden."
                : "."}
            </p>
          </div>
        );
      })}
    </section>
  );
}
