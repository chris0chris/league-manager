/**
 * The event vocabulary: the scorecard stops describing plays to the server and
 * appends events instead.
 *
 * `POST /api/game/<id>/events` takes envelopes
 * (`{type, code, side, player, period, payload}`), so the client has to own
 * what an event *means*. This module is that table -- one entry per play the
 * screens can submit -- and the one place the envelope shape is built.
 *
 * It mirrors `gameevents/service/legacy.py` (the server's translation of the
 * old names) and `gameevents/service/projector.py` (how a code becomes a
 * `TeamLog` row and points). That duplication is the point of this slice: the
 * server no longer translates for the app. Slice 3 replaces both tables with
 * sport definitions the app fetches; until then the tests here and the
 * projector's golden cases are the two sides of the same contract.
 *
 * Two quirks are carried over deliberately, because a promise the server does
 * not keep is worse than a rejected tap:
 *
 * - a jersey arrives as free text; `coercePlayer` truncates `"51.85"` to 51 and
 *   drops anything outside `0..32767`, exactly as the server does;
 * - a scoring event without a usable jersey scores nothing (the server stores
 *   value 0), so the optimistic score must not promise points for it.
 */
import type { GameLog, GameLogEventInput, GameLogWrite } from "../api/types";
import type { LogRow } from "../components/EventLog";
import {
  DEFAULT_SCORING_VALUES,
  type ScoringValues,
} from "../app/scoring";

/** One event as the append endpoint stores it. */
export interface EventEnvelope {
  type: string;
  code?: string;
  /** `home`/`away`; absent for the period markers. */
  side?: "home" | "away" | null;
  player?: number | null;
  /** The half the play belongs to (1-based). */
  period?: number;
  payload?: Record<string, unknown>;
}

type Side = "home" | "away";

/** How one legacy wire name maps into the event vocabulary. */
interface LegacySpec {
  type: string;
  code?: string;
  /** Safety encodes its points in the payload rather than the code. */
  points?: number;
  /** Which field of the old entry supplies the code (`code`) or `payload.input`. */
  input?: "code" | "payload";
}

/**
 * Mirrors `LEGACY_EVENTS` in `gameevents/service/legacy.py`. A name this table
 * does not know stays a plain event: the server rejects unknown codes with a
 * 400, and inventing one here would only move the failure.
 */
const LEGACY_EVENTS: Record<string, LegacySpec> = {
  Touchdown: { type: "score", code: "touchdown" },
  "1-Extra-Punkt": { type: "score", code: "pat1" },
  "2-Extra-Punkte": { type: "score", code: "pat2" },
  Overtime: { type: "score", code: "overtime" },
  "Safety (+1)": { type: "score", code: "safety", points: 1 },
  "Safety (+2)": { type: "score", code: "safety", points: 2 },
  Turnover: { type: "possession", code: "turnover" },
  Interception: { type: "possession", code: "interception" },
  "First Down": { type: "series", code: "first_down" },
  Strafe: { type: "penalty", input: "code" },
  Spielzeit: { type: "time", code: "clock", input: "payload" },
  Auszeit: { type: "timeout", input: "payload" },
  Pass: { type: "play", code: "pass", input: "payload" },
  "Pass unvollständig": { type: "play", code: "pass", input: "payload" },
  Run: { type: "play", code: "run", input: "payload" },
  Sack: { type: "play", code: "sack", input: "payload" },
  Challenge: { type: "challenge", input: "payload" },
  Feldposition: { type: "fieldpos", input: "payload" },
  "Overtime starten": { type: "period", code: "overtime" },
};

/**
 * What a row is worth, from the sport definition (see `app/scoring.ts`).
 * `gameevents/service/rules.py` is the server's single source; the defaults
 * cover a device that has not fetched the definition yet.
 */

/** Rows the writer stores with sequence 0 (`EXCLUDED_EVENTS` server-side). */
export const EXCLUDED_EVENTS = new Set([
  "Strafe",
  "Spielzeit",
  "Auszeit",
  "First Down",
]);

/** Period markers: shown in the log, never undoable, never scored. */
export const MARKER_EVENTS = new Set([
  "Spiel gestartet",
  "2. Halbzeit gestartet",
  "Spiel beendet",
]);

const PLAYER_MIN = 0;
const PLAYER_MAX = 32767;

/**
 * A jersey as `TeamLog.player` can store it: `"51.85"` -> 51, anything that is
 * not a number in range -> `null` (which scores nothing).
 */
export function coercePlayer(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Math.trunc(Number(value));
  if (!Number.isFinite(number)) {
    return null;
  }
  if (number < PLAYER_MIN || number > PLAYER_MAX) {
    return null;
  }
  return number;
}

/** Which side of `log` a team *name* names, or `null` when it is in neither. */
export function sideOfName(name: string | null | undefined, log: GameLog): Side | null {
  const token = name?.trim().toLowerCase();
  if (token === undefined || token === "") {
    return null;
  }
  if (log.home.name?.trim().toLowerCase() === token) {
    return "home";
  }
  if (log.away.name?.trim().toLowerCase() === token) {
    return "away";
  }
  return null;
}

/**
 * One submitted play list (the shape the sheets produce) as envelopes.
 *
 * Throws for a team the log does not contain: without a side the server would
 * have to guess, and a misplaced touchdown is worse than a refused tap. The
 * message is the one the officials see, so it names the cause.
 */
export function envelopesForWrite(
  write: GameLogWrite,
  log: GameLog,
): EventEnvelope[] {
  const side = sideOfName(write.team, log);
  if (side === null) {
    throw new Error(`Das Team „${write.team}“ gehört nicht zu diesem Spiel.`);
  }
  return write.event.map((entry) => envelopeFor(entry, side, write.half));
}

function envelopeFor(
  entry: GameLogEventInput,
  side: Side,
  half: 1 | 2 | 3,
): EventEnvelope {
  const name = entry.name;
  const spec = LEGACY_EVENTS[name];
  if (spec === undefined) {
    // An unknown play keeps its name, so the server's 400 names it. Without
    // this the tap would vanish silently instead of being refused.
    return {
      type: "score",
      code: name,
      side,
      player: coercePlayer(entry.player),
      period: half,
    };
  }
  // Every play the sheets submit belongs to a side; the period markers are
  // built by `halftimeEnvelope`, not from a play name.
  const envelope: EventEnvelope = {
    type: spec.type,
    code: spec.code ?? "",
    side,
    player: coercePlayer(entry.player),
    period: half,
  };
  if (spec.points !== undefined) {
    envelope.payload = { points: spec.points };
  }
  // The play's structured detail (yards, quarterback, complete) is what a
  // later statistics read consumes; it never changes what the log renders.
  // Merged before the visible text so a stale `payload.input` from a
  // correction cannot overwrite the new one (the 0-yard edit bug).
  if (entry.payload !== undefined) {
    envelope.payload = { ...(envelope.payload ?? {}), ...entry.payload };
  }
  if (spec.input === "code") {
    envelope.code = entry.input ?? "";
  }
  if (spec.input === "payload" && entry.input !== undefined) {
    envelope.payload = { ...(envelope.payload ?? {}), input: entry.input };
  }
  // A row that shows a free text but has no legacy `input` mapping still sends
  // it: the interception's "bis B20 · 15 Yards Return" is the row's visible
  // detail, and the projector stores it like the legacy writer did.
  if (
    spec.input === undefined &&
    entry.input !== undefined &&
    entry.input !== ""
  ) {
    envelope.payload = { ...(envelope.payload ?? {}), input: entry.input };
  }
  if (spec.type === "timeout") {
    // The timeout's code is its side; the server reads either.
    envelope.code = side;
  }
  return envelope;
}

/**
 * A log row as the event that wrote it.
 *
 * Used where a correction has to re-send a whole submission: the row keeps the
 * name, the jersey, the visible text and the structured detail, which is
 * everything the envelope needs to reproduce it.
 */
export function eventOfRow(row: LogRow): GameLogEventInput {
  const event: GameLogEventInput = { name: row.event };
  if (row.player !== null) {
    event.player = row.player;
  }
  if (row.input !== null) {
    event.input = row.input;
  }
  if (row.payload !== null) {
    event.payload = { ...row.payload };
  }
  return event;
}

/** `{type: "possession", code: "home"|"away"}` -- the ball changes hands. */
export function possessionEnvelope(side: Side): EventEnvelope {
  return { type: "possession", code: side, side };
}

/** `{type: "period", code: "half_time"}` -- the second half starts. */
export function halftimeEnvelope(): EventEnvelope {
  return { type: "period", code: "half_time", side: null };
}

/** `{type: "correction", code: "undo", payload: {undo_of}}`. */
export function correctionEnvelope(seq: number): EventEnvelope {
  return { type: "correction", code: "undo", payload: { undo_of: seq } };
}

/**
 * What one envelope puts on screen: the row's label, its points and whether it
 * is a marker. Mirrors `apply()` in `gameevents/service/projector.py`.
 */
export interface EnvelopeDisplay {
  /** The German event name the log shows, or `null` for "no row". */
  event: string | null;
  /** Points this row carries *if* it has a usable jersey. */
  value: number;
  cop: boolean;
  /** Stored with sequence 0: many such rows share one sequence. */
  excluded: boolean;
  marker: boolean;
}

export function displayOf(
  envelope: EventEnvelope,
  scoring: ScoringValues = DEFAULT_SCORING_VALUES,
): EnvelopeDisplay {
  const code = envelope.code ?? "";
  const none = (extra: Partial<EnvelopeDisplay> = {}): EnvelopeDisplay => ({
    event: null,
    value: 0,
    cop: false,
    excluded: false,
    marker: false,
    ...extra,
  });

  switch (envelope.type) {
    case "score": {
      if (code === "safety") {
        const points = envelope.payload?.points;
        if (points !== 1 && points !== 2) {
          return none();
        }
        const name = `Safety (+${points})`;
        return { ...none(), event: name, value: scoring[name] ?? 0 };
      }
      const name = {
        touchdown: "Touchdown",
        pat1: "1-Extra-Punkt",
        pat2: "2-Extra-Punkte",
        overtime: "Overtime",
      }[code];
      if (name === undefined) {
        return none();
      }
      // A missed try keeps the try's name but is worth nothing: the server
      // derives the row's value from `payload.missed`, so the optimistic score
      // must not promise the points (gamelog.py, projector.py `_apply_score`).
      if (envelope.payload?.missed === true) {
        return { ...none(), event: name };
      }
      return { ...none(), event: name, value: scoring[name] ?? 0 };
    }
    case "penalty":
      return { ...none(), event: "Strafe", excluded: true };
    case "challenge":
      return { ...none(), event: "Challenge" };
    case "fieldpos":
      return { ...none(), event: "Feldposition" };
    case "series":
      return code === "first_down"
        ? { ...none(), event: "First Down", excluded: true }
        : none();
    case "possession":
      if (code === "turnover") {
        return { ...none(), event: "Turnover", cop: true };
      }
      if (code === "interception") {
        return { ...none(), event: "Interception", cop: true };
      }
      // `home`/`away` only moves the marker; there is no row.
      return none();
    case "time":
      return { ...none(), event: "Spielzeit", excluded: true };
    case "timeout":
      return { ...none(), event: "Auszeit", excluded: true };
    case "play": {
      const name = {
        pass: "Pass",
        run: "Run",
        sack: "Sack",
      }[code];
      if (name === undefined) {
        return none();
      }
      // An incomplete pass has its own row name; the payload says which.
      const incomplete =
        code === "pass" && envelope.payload?.complete === false;
      return {
        ...none(),
        event: incomplete ? "Pass unvollständig" : name,
      };
    }
    case "period": {
      const name = {
        start: "Spiel gestartet",
        half_time: "2. Halbzeit gestartet",
        overtime: "Overtime startet",
        end: "Spiel beendet",
      }[code];
      return name === undefined
        ? none()
        : { ...none(), event: name, excluded: true, marker: true };
    }
    default:
      // `correction` writes no row; an unknown type is the server's 400.
      return none();
  }
}
