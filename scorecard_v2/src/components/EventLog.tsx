import { useState, type ComponentType } from "react";

import type { GameLog, GameLogEvent, LogEntry } from "../api/types";
import {
  MIDFIELD,
  driveText,
  downOf,
  goalOf,
  spotOf,
  spotText,
} from "../app/drive";
import {
  ArrowRight,
  Clock,
  Flag,
  Football,
  Interception,
  Pencil,
  Play,
  PlusCircle,
  Shield,
  Stopwatch,
  Undo,
  Whistle,
  type IconProps,
} from "./icons";

/**
 * The event names `GameLog._get_entries_for_team_and_half` filters out of the
 * scoring entries. They share sequence 0 with each other (and with the game
 * markers), so they can only be undone row by row.
 */
const EXCLUDED_EVENTS = new Set([
  "Strafe",
  "Spielzeit",
  "Auszeit",
  "First Down",
]);

const SCORING_KEYS: Record<string, string> = {
  td: "Touchdown",
  pat1: "1-Extra-Punkt",
  pat2: "2-Extra-Punkte",
  OT: "Overtime",
};

/**
 * Game-level markers. A marker that can be corrected carries its own undo;
 * "gestartet" and "beendet" stay non-undoable because deleting their row
 * cannot revert `Gameinfo.gameStarted` / `gameFinished`, so undo would lie
 * about the game state.
 */
const MARKER_EVENTS = new Set([
  "Spiel gestartet",
  "2. Halbzeit gestartet",
  "Overtime startet",
  "Spiel beendet",
]);

/** A wrong half-time or overtime start can be stepped back from its row. */
const UNDOABLE_MARKERS = new Set(["2. Halbzeit gestartet", "Overtime startet"]);

const FALLBACK_IGNORED_KEYS = new Set([
  "sequence",
  "time",
  "isDeleted",
  "cop",
  "name",
  "player",
  "td",
  "pat1",
  "pat2",
  "OT",
]);

export type EventKind =
  | "td"
  | "pat"
  | "pen"
  | "int"
  | "first"
  | "safety"
  | "to"
  | "time"
  | "play"
  | "note";

/** One icon per kind; the visible row text still carries the meaning. */
const KIND_ICON: Record<EventKind, ComponentType<IconProps>> = {
  td: Football,
  pat: PlusCircle,
  pen: Flag,
  int: Interception,
  first: ArrowRight,
  safety: Shield,
  to: Clock,
  time: Stopwatch,
  play: Play,
  note: Whistle,
};

/** One rendered log line — a raw event or a reconstructed scoring entry. */
export interface LogRow {
  /** Stable React key. */
  key: string;
  /** `TeamLog` pk; `null` only for rows reconstructed from scoring entries. */
  teamLogId: number | null;
  /**
   * The **event** that wrote this row (`GameEvent.seq`), or `null` for a game
   * the old app wrote / a row reconstructed from scoring entries. Naming an
   * event is what an undo sends; it is *not* the group id.
   */
  eventSeq: number | null;
  /**
   * The **submission** this row belongs to (`TeamLog.sequence`): every row one
   * submission wrote shares it, which is how a scoring play and its touchdown
   * stay one group. `0` is the shared bucket of the excluded rows (penalties,
   * clocks, first downs) and the period markers - never a real group.
   *
   * Deliberately not called `seq`: the two ids differ (a touchdown row in a
   * play's group has its own `eventSeq` but the play's `groupSequence`), and
   * swapping them is exactly the bug the UI shipped on 2026-11-06.
   */
  groupSequence: number;
  team: string | null;
  event: string;
  player: number | null;
  input: string | null;
  half: number;
  cop: boolean;
  isDeleted: boolean;
  /** ISO-8601 UTC, or `null` when the server omitted it. */
  time: string | null;
  /** Structured event detail (yards, quarterback, …); `null` without one. */
  payload: Record<string, unknown> | null;
}

/**
 * What undoing one row sends.
 *
 * Every row an event wrote names that event's `seq` (`{undo_of}`) — including a
 * penalty or a clock, whose row sits in the shared sequence 0: the server
 * deletes exactly that row. A scoring play's correction removes the whole
 * submission group, so a touchdown takes its conversion with it.
 *
 * Only a row that **no event wrote** has no `seq` (a game the old app wrote
 * before the event store existed); it keeps the pre-event `DELETE`, which is
 * all the server can do with it.
 */
export function undoBody(
  row: LogRow,
):
  | { undo_of: number }
  | { sequence: number }
  | { team_log_id: number } {
  // An event-sourced row names its event. A scoring play's correction removes
  // the whole submission group (a touchdown takes its conversion with it); a
  // penalty's removes exactly that row, even though it shares sequence 0.
  if (row.eventSeq !== null) {
    return { undo_of: row.eventSeq };
  }
  // No event wrote this row (a game the old app recorded before the store
  // existed). Excluded events and markers share sequence 0 across many rows,
  // so they go by row id; a scoring play goes by sequence.
  if (
    row.teamLogId !== null &&
    (EXCLUDED_EVENTS.has(row.event) || row.groupSequence === 0)
  ) {
    return { team_log_id: row.teamLogId };
  }
  return { sequence: row.groupSequence };
}

/** Markers are shown but not undoable; see {@link MARKER_EVENTS}. */
export function isMarker(row: LogRow): boolean {
  return MARKER_EVENTS.has(row.event);
}

/**
 * Whether the row offers its undo. Every regular row does; of the game-level
 * markers only the half-time and overtime start, whose correction the server
 * projects back into the first half / before the overtime.
 */
export function isUndoable(row: LogRow): boolean {
  if (row.isDeleted) {
    return false;
  }
  return !isMarker(row) || UNDOABLE_MARKERS.has(row.event);
}

/**
 * The events whose entry can be corrected after the fact: a jersey (all of
 * them but the clocks), or the game time of a clock. A turnover and the
 * markers change nothing the official could mistype.
 */
const EDITABLE_EVENTS = new Set([
  "Touchdown",
  "1-Extra-Punkt",
  "2-Extra-Punkte",
  "Safety (+1)",
  "Safety (+2)",
  "Safety",
  "Overtime",
  "First Down",
  "Interception",
  "Turnover",
  "Pass",
  "Pass unvollständig",
  "Run",
  "Sack",
  "Strafe",
  "Spielzeit",
  "Auszeit",
  "Feldposition",
  "Challenge",
]);

/**
 * A row an event wrote and the officials may correct. A row the old app wrote
 * (no `seq`) is excluded as well: the correction has no event to name.
 */
export function isEditable(row: LogRow): boolean {
  return (
    !row.isDeleted &&
    !isMarker(row) &&
    row.eventSeq !== null &&
    EDITABLE_EVENTS.has(row.event)
  );
}

/** The scoring rows, for the "Nur Punkte" view. */
const SCORING_EVENTS = new Set([
  "Touchdown",
  "1-Extra-Punkt",
  "2-Extra-Punkte",
  "Safety (+1)",
  "Safety (+2)",
  "Safety",
  "Overtime",
]);

/** True for the events that put points on the board. */
export function isScoring(row: LogRow): boolean {
  return SCORING_EVENTS.has(row.event) && !isMissedTry(row);
}

/** The two-point try's and the one-point try's words, as the log names them. */
const TRY_EVENTS = new Set(["1-Extra-Punkt", "2-Extra-Punkte"]);

/** The visible detail a missed try starts with (see the write contract). */
const MISSED_TRY = "nicht verwandelt";

/**
 * True when a conversion row means the try failed.
 *
 * A miss is a real row: it carries the attempted receiver (or none) and the
 * detail (`nicht verwandelt · Tackle #2`). The event payload says so with
 * `missed: true`; the visible text starts with `nicht verwandelt`. A converted
 * try carries neither. Rows the old app wrote before the event store cannot be
 * told apart here — their `value` is not part of the events payload — so they
 * keep rendering as today.
 */
export function isMissedTry(row: LogRow): boolean {
  if (!TRY_EVENTS.has(row.event)) {
    return false;
  }
  if (row.payload?.missed === true) {
    return true;
  }
  return (row.input ?? "").trim().startsWith(MISSED_TRY);
}

/** The detail after the leading `nicht verwandelt`, or the whole detail. */
function missedDetail(input: string | null): string | null {
  const text = (input ?? "").trim();
  if (text === "") {
    return null;
  }
  if (!text.startsWith(MISSED_TRY)) {
    return text;
  }
  const rest = text
    .slice(MISSED_TRY.length)
    .replace(/^[\s·]+/, "")
    .trim();
  return rest === "" ? null : rest;
}

function jersey(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function jerseyText(value: number | null): string | null {
  return value === null ? null : `#${value}`;
}

function join(...parts: (string | null | undefined)[]): string | null {
  const text = parts.filter((part): part is string => Boolean(part)).join(" · ");
  return text === "" ? null : text;
}

function eventToRow(event: GameLogEvent): LogRow {
  return {
    key: `e${event.id}`,
    teamLogId: event.id,
    eventSeq: event.seq ?? null,
    groupSequence: event.sequence,
    team: event.team,
    event: event.event,
    player: event.player,
    input: event.input?.trim() || null,
    half: event.half,
    cop: event.cop,
    isDeleted: event.isDeleted,
    time: event.time ?? null,
    payload: event.payload ?? null,
  };
}

/**
 * Rebuild rows from the scoring entries of a server that predates `events`.
 * The non-scoring events are absent by definition; the scoring plays keep
 * working, including their undo by sequence.
 */
function fallbackRows(log: GameLog): LogRow[] {
  const rows: LogRow[] = [];
  const sides = [
    ["home", log.home],
    ["away", log.away],
  ] as const;
  const halves = [
    ["firsthalf", 1],
    ["secondhalf", 2],
  ] as const;

  for (const [side, team] of sides) {
    for (const [halfKey, half] of halves) {
      team[halfKey].entries.forEach((entry: LogEntry, index) => {
        const base = {
          teamLogId: null,
          eventSeq: null,
          groupSequence: entry.sequence,
          team: team.name,
          half,
          cop: entry.cop === true,
          isDeleted: entry.isDeleted === true,
          time: typeof entry.time === "string" ? entry.time : null,
          payload: null,
        };
        const key = (event: string) =>
          `s-${side}-${halfKey}-${entry.sequence}-${event}-${index}`;

        const scoring = Object.entries(SCORING_KEYS).filter(
          ([field]) => entry[field] !== undefined,
        );
        for (const [field, event] of scoring) {
          rows.push({
            ...base,
            key: key(event),
            event,
            player: jersey(entry[field]),
            input: null,
          });
        }
        if (entry.cop === true && typeof entry.name === "string") {
          rows.push({
            ...base,
            key: key(entry.name),
            event: entry.name,
            player: jersey(entry.player),
            input: null,
          });
        }
        for (const [field, value] of Object.entries(entry)) {
          if (FALLBACK_IGNORED_KEYS.has(field)) {
            continue;
          }
          rows.push({
            ...base,
            key: key(field),
            event: field,
            player: jersey(value),
            input: null,
          });
        }
      });
    }
  }

  // Newest first. The halves themselves are chronological, so a missing time
  // falls back to the later half, then the higher sequence.
  return rows.sort((left, right) => {
    if (left.time !== null && right.time !== null && left.time !== right.time) {
      return left.time < right.time ? 1 : -1;
    }
    if (left.time === null && right.time !== null) {
      return 1;
    }
    if (left.time !== null && right.time === null) {
      return -1;
    }
    if (left.half !== right.half) {
      return right.half - left.half;
    }
    return right.groupSequence - left.groupSequence;
  });
}

/** Log rows, newest first. The server's `events` win; entries are the fallback. */
export function logRows(log: GameLog): LogRow[] {
  if (Array.isArray(log.events)) {
    return log.events.map(eventToRow);
  }
  return fallbackRows(log);
}

interface Described {
  kind: EventKind;
  primary: string;
  secondary: string | null;
  /** True for a conversion that failed: shown, never counted as points. */
  missed?: boolean;
}

/** The row's one-line label plus its optional detail line. */
export function describeRow(row: LogRow): Described {
  const team = row.team ?? "–";
  switch (row.event) {
    case "Touchdown":
      return {
        kind: "td",
        primary: `Touchdown ${team}`,
        secondary: join(jerseyText(row.player), row.input),
      };
    case "1-Extra-Punkt":
    case "2-Extra-Punkte": {
      const label =
        row.event === "1-Extra-Punkt" ? "1 Extrapunkt" : "2 Extrapunkte";
      if (isMissedTry(row)) {
        return {
          kind: "pat",
          primary: `${label} nicht verwandelt ${team}`,
          secondary: join(jerseyText(row.player), missedDetail(row.input)),
          missed: true,
        };
      }
      return {
        kind: "pat",
        primary: `${label} ${team}`,
        secondary: jerseyText(row.player),
      };
    }
    case "Overtime":
      return {
        kind: "pat",
        primary: `Overtime ${team}`,
        secondary: jerseyText(row.player),
      };
    case "Turnover":
    case "Interception":
      return {
        kind: "int",
        primary: `${row.event} ${team}`,
        // The interception sheet writes where the return ended; the row shows
        // it beside the defender's number, like the play rows show their text.
        secondary: join(jerseyText(row.player), row.input),
      };
    case "First Down":
      return {
        kind: "first",
        primary: `1st Down ${team}`,
        secondary: join(jerseyText(row.player), row.input),
      };
    case "Pass":
    case "Pass unvollständig":
    case "Run":
    case "Sack":
      return {
        kind: "play",
        primary: `${row.event} ${team}`,
        secondary: join(jerseyText(row.player), row.input),
      };
    case "Safety (+1)":
    case "Safety (+2)":
    case "Safety": {
      const points = row.event.endsWith("(+1)")
        ? "+1 Punkt"
        : row.event.endsWith("(+2)")
          ? "+2 Punkte"
          : null;
      return {
        kind: "safety",
        primary: `Safety · ${team}`,
        secondary: join(points, jerseyText(row.player)),
      };
    }
    case "Strafe": {
      const unsportsmanlike =
        typeof row.payload?.unsportsmanlike === "string"
          ? row.payload.unsportsmanlike.trim()
          : "";
      return {
        kind: "pen",
        primary: `Strafe gegen ${team}`,
        secondary: join(
          row.input,
          unsportsmanlike === "" ? null : `Nr. ${unsportsmanlike}`,
          jerseyText(row.player),
        ),
      };
    }
    case "Feldposition": {
      // The row sets the spot and, since the sheet asks, the down and the line
      // to gain: the officials read the whole situation (`Feldposition 1st &
      // M · A4`), not only the yard line. A row the old app wrote carries none
      // of the structured data and keeps its text.
      const spot = spotOf(row);
      const down = downOf(row);
      const goal = goalOf(row);
      if (spot !== null && (down !== null || goal !== null)) {
        const line = driveText({
          down: down ?? 1,
          toGo: 0,
          ballOn: spot,
          goal: goal ?? spot >= MIDFIELD,
        });
        return {
          kind: "note",
          // A set spot always has a label; `spotText` is only `null` without one.
          primary: `Feldposition ${line} · ${spotText(spot)!}`,
          secondary: null,
        };
      }
      return { kind: "note", primary: "Feldposition", secondary: row.input };
    }
    case "Auszeit":
      return {
        kind: "to",
        primary: `Auszeit ${team}`,
        secondary: row.input,
      };
    case "Spielzeit":
      return {
        kind: "time",
        primary: `Spielzeit ${row.input ?? ""}`.trim(),
        secondary: null,
      };
    default:
      return {
        kind: "note",
        primary: row.event,
        secondary: row.input,
      };
  }
}

/**
 * The attribution an entry carries when it was recorded by one user and sent
 * by another (an outbox row that survived a login change). The server keeps
 * the sender as the author and stores the recorder's name as an unverified
 * claim, so the row says both without pretending the claim is verified.
 */
export function offlineAttribution(row: LogRow): string | null {
  const recorded =
    typeof row.payload?.offline_recorded_by === "string"
      ? row.payload.offline_recorded_by.trim()
      : "";
  if (recorded === "") {
    return null;
  }
  const sent =
    typeof row.payload?.offline_sent_by === "string"
      ? row.payload.offline_sent_by.trim()
      : "";
  return sent === ""
    ? `erfasst von ${recorded}`
    : `erfasst von ${recorded}, gesendet von ${sent}`;
}

/** `HH:MM` in the viewer's local time; an unparsable value renders empty. */
export function formatLogTime(iso: string | null): string {
  if (iso === null) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface EventLogProps {
  rows: LogRow[];
  /** Omitted where the log is read-only (the result screen). */
  onUndo?: (row: LogRow) => void;
  /** Correct a row in place; omitted where the log is read-only. */
  onEdit?: (row: LogRow) => void;
  /** Key of the row whose undo is in flight; its button is disabled. */
  undoKey?: string | null;
  /**
   * True while another write owns the screen (half-time). Undo waits: a
   * `DELETE` answer that lands after the half switch still describes the first
   * half and would put the screen back there.
   */
  disabled?: boolean;
  /** Undo failure shown above the list. */
  error?: string | null;
}

/**
 * The live log: newest first, one row per event, undo per row.
 *
 * The list scrolls inside its own block so the score header stays put while
 * an official thumbs through a long second half.
 */
export default function EventLog({
  rows,
  onUndo,
  onEdit,
  undoKey = null,
  disabled = false,
  error = null,
}: EventLogProps) {
  const [onlyPoints, setOnlyPoints] = useState(false);
  const shown = onlyPoints ? rows.filter(isScoring) : rows;
  return (
    <section aria-label="Spielverlauf" className="logblock">
      <div className="loghead">
        <h2>Spielverlauf</h2>
        <button
          aria-pressed={onlyPoints}
          className={onlyPoints ? "logfilter sel" : "logfilter"}
          onClick={() => setOnlyPoints((current) => !current)}
          type="button"
        >
          Nur Punkte
        </button>
        <span>{shown.length} Einträge</span>
      </div>
      {error === null ? null : (
        <p className="logerror" role="alert">
          {error}
        </p>
      )}
      {shown.length === 0 ? (
        <p className="logempty">
          {rows.length === 0 ? "Noch keine Einträge" : "Noch keine Punkte"}
        </p>
      ) : (
        <ol className="logrows">
          {shown.map((row) => {
            const described = describeRow(row);
            const secondary = join(described.secondary, offlineAttribution(row));
            const KindIcon = KIND_ICON[described.kind];
            const undoable =
              onUndo !== undefined && isUndoable(row);
            return (
              <li
                className={
                  row.isDeleted
                    ? "row deleted"
                    : described.missed
                      ? "row miss"
                      : "row"
                }
                key={row.key}
              >
                <span
                  aria-hidden="true"
                  className={`ev ev-${described.kind}`}
                >
                  <KindIcon size={18} />
                </span>
                <span className="rowmain">
                  <span className="rowprimary">{described.primary}</span>
                  {secondary === null ? null : (
                    <span className="rowsub">{secondary}</span>
                  )}
                  {row.isDeleted ? (
                    <span className="sr-only">gelöscht</span>
                  ) : null}
                  {row.teamLogId !== null && row.teamLogId < 0 ? (
                    // Queued on this device, not yet confirmed by the server.
                    <span className="rowpending">wartet</span>
                  ) : null}
                </span>
                <span className="rowright">
                  <time className="rowtime" dateTime={row.time ?? undefined}>
                    {formatLogTime(row.time)}
                  </time>
                  {onEdit !== undefined && isEditable(row) ? (
                    <button
                      aria-label={`Ändern: ${described.primary}`}
                      className="undo edit"
                      disabled={disabled || undoKey !== null}
                      onClick={() => onEdit(row)}
                      title={`Ändern: ${described.primary}`}
                      type="button"
                    >
                      <Pencil size={18} />
                    </button>
                  ) : null}
                  {undoable ? (
                    <button
                      aria-label={`Rückgängig: ${described.primary}`}
                      className="undo"
                      disabled={disabled || undoKey !== null}
                      onClick={() => onUndo?.(row)}
                      title={`Rückgängig: ${described.primary}`}
                      type="button"
                    >
                      <Undo size={18} />
                    </button>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <footer className="logfoot">
        <span className="logfoot-newest">Neueste oben</span>
        {onUndo === undefined ? null : (
          <span className="logfoot-undo">
            Letzten Eintrag rückgängig <kbd>Strg Z</kbd>
          </span>
        )}
      </footer>
    </section>
  );
}
