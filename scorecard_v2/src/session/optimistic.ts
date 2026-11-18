/**
 * "Last server payload + queued ops" — the log the screen shows while the
 * outbox still holds writes.
 *
 * The plan's offline contract is explicit: **the score is never recomputed
 * client-side**. This module therefore never derives a score from the log's
 * events. It keeps the server's score and adds the *delta* of the ops still in
 * the queue, exactly as if they had landed. The next server payload replaces
 * both the rows and the score, which is why nothing here is persisted: a
 * reload rebuilds the same view from the snapshot plus the durable queue.
 *
 * Since slice 2 the queue holds **events**, not play descriptions, so this
 * module also answers "what does this event look like on screen" (via
 * `displayOf` in `./events`) — still only for the delta, never for the base.
 *
 * Synthetic rows carry a negative `id`; {@link ReplayResult.opByEventId} maps
 * each one back to the queued op that produced it, so undoing a row that never
 * reached the server removes the op instead of appending a correction.
 */
import type {
  GameLog,
  GameLogEvent,
  GameLogTeam,
} from "../api/types";
import {
  DEFAULT_SCORING_VALUES,
  type ScoringValues,
} from "../app/scoring";
import type { PendingOp, StoredOp } from "../offline/types";
import {
  EXCLUDED_EVENTS,
  coercePlayer,
  displayOf,
  envelopesForWrite,
  halftimeEnvelope,
  possessionEnvelope,
  sideOfName,
  type EventEnvelope,
} from "./events";

type Side = "home" | "away";
export interface ReplayResult {
  log: GameLog;
  /** Synthetic (negative) event id → the queued op that produced it. */
  opByEventId: Map<number, string>;
}

interface LegacyWritePayload {
  team?: string;
  half?: number;
  event?: { name: string; player?: number | string; input?: string }[];
}

interface DeletePayload {
  sequence?: number;
  team_log_id?: number;
}

/**
 * The envelopes one queued op stands for.
 *
 * New rows carry them (`{events: [...]}`). A row written by a build before
 * slice 2 still carries the play description or the old `{team}` possession
 * payload, so it is translated here — the queue must survive an app update.
 * `null` means "cannot be translated" (a possession op whose team is not in
 * this log); the transport turns that into a visible rejection rather than a
 * silent drop.
 */
export function envelopesOf(
  op: Pick<PendingOp, "kind" | "payload">,
  log: GameLog,
): EventEnvelope[] | null {
  const payload = op.payload as { events?: EventEnvelope[] };
  if (Array.isArray(payload?.events)) {
    return payload.events;
  }

  if (op.kind === "event") {
    const legacy = op.payload as LegacyWritePayload;
    if (!Array.isArray(legacy?.event) || typeof legacy.team !== "string") {
      return null;
    }
    try {
      return envelopesForWrite(
        {
          gameId: 0,
          team: legacy.team,
          half: (legacy.half ?? 1) >= 2 ? 2 : 1,
          event: legacy.event.map((entry) => ({
            name: entry.name,
            player: entry.player as number | undefined,
            input: entry.input,
          })),
        },
        log,
      );
    } catch {
      return null;
    }
  }

  if (op.kind === "possession") {
    // A row from the old build stored the team *name* (the removed `PUT
    // /possession` took it); there is no side to read from it.
    const side = sideOfName((op.payload as { team?: string })?.team, log);
    return side === null ? null : [possessionEnvelope(side)];
  }

  if (op.kind === "halftime") {
    return [halftimeEnvelope()];
  }

  if (op.kind === "correction") {
    const undoOf = (op.payload as { undo_of?: number })?.undo_of;
    return typeof undoOf === "number"
      ? [{ type: "correction", code: "undo", payload: { undo_of: undoOf } }]
      : null;
  }

  return null;
}

function halfKey(half: number): "firsthalf" | "secondhalf" {
  // Overtime is period 3 but still belongs to the second half's block: the
  // log's two groups and every consumer that reads them stay 1/2.
  return half >= 2 ? "secondhalf" : "firsthalf";
}

/**
 * Add a score delta to one side. Kept separate from the rows so the module can
 * never be mistaken for a score calculation: the base score is the server's.
 */
function addScore(
  team: GameLogTeam,
  half: number,
  delta: number,
): GameLogTeam {
  if (delta === 0) {
    return team;
  }
  const key = halfKey(half);
  return {
    ...team,
    score: team.score + delta,
    [key]: { ...team[key], score: team[key].score + delta },
  };
}

function withDelta(log: GameLog, side: Side, half: number, delta: number): void {
  if (side === "home") {
    log.home = addScore(log.home, half, delta);
  } else {
    log.away = addScore(log.away, half, delta);
  }
}

function teamName(log: GameLog, side: Side): string | null {
  return side === "home" ? log.home.name : log.away.name;
}

/**
 * The log to render: `base` (the last server payload) plus every queued op, in
 * FIFO order. Pure — the base is never mutated.
 *
 * Without a `events` array (a server that predates the field) the rows cannot
 * be replayed and the base log is returned unchanged; the queued count still
 * tells the official that writes are waiting.
 */
export function replayOps(base: GameLog, ops: StoredOp[]): ReplayResult {
  const opByEventId = new Map<number, string>();
  if (!Array.isArray(base.events)) {
    return { log: base, opByEventId };
  }

  const log: GameLog = {
    ...base,
    events: base.events.map((event) => ({ ...event })),
    home: cloneTeam(base.home),
    away: cloneTeam(base.away),
  };
  const events = log.events as GameLogEvent[];
  let nextSeq =
    events.reduce((max, event) => Math.max(max, event.sequence), 0) + 1;
  let nextLocalId = 0;

  const row = (
    op: StoredOp,
    name: string,
    {
      side = null,
      player = null,
      input = null,
      half,
      cop = false,
      excluded = false,
      payload = null,
    }: {
      side?: Side | null;
      player?: number | null;
      input?: string | null;
      half: number;
      cop?: boolean;
      excluded?: boolean;
      payload?: Record<string, unknown> | null;
    },
  ): void => {
    const sequence = excluded ? 0 : nextSeq++;
    const localId = --nextLocalId;
    opByEventId.set(localId, op.id);
    events.unshift({
      id: localId,
      sequence,
      seq: null,
      team: side === null ? null : teamName(log, side),
      event: name,
      player,
      input,
      half,
      cop,
      isDeleted: false,
      time: new Date(op.createdAt).toISOString(),
      payload,
    });
  };

  for (const op of ops) {
    if (op.kind === "delete") {
      // The pre-slice-2 undo, still queued on a device that has not reloaded
      // since the update (or used by an official on a legacy row).
      const payload = op.payload as DeletePayload;
      for (const event of events) {
        if (event.isDeleted) {
          continue;
        }
        const matches =
          payload.team_log_id !== undefined
            ? event.id === payload.team_log_id
            : event.sequence === payload.sequence &&
              !EXCLUDED_EVENTS.has(event.event);
        if (!matches) {
          continue;
        }
        event.isDeleted = true;
        const side = sideOfName(event.team ?? undefined, log);
        if (side !== null) {
          withDelta(log, side, event.half, -pointsOfRow(event));
        }
      }
      continue;
    }

    const envelopes = envelopesOf(op, log);
    if (envelopes === null) {
      continue;
    }
    for (const envelope of envelopes) {
      applyEnvelope(op, envelope);
    }
  }

  function applyEnvelope(op: StoredOp, envelope: EventEnvelope): void {
    const display = displayOf(envelope);
    const half = (envelope.period ?? 1) >= 2 ? 2 : 1;

    if (envelope.type === "correction") {
      // The target is a stored row group: mark its rows deleted and take
      // their points back, exactly as the projector's correction does.
      const undoOf = envelope.payload?.undo_of;
      if (typeof undoOf !== "number") {
        return;
      }
      for (const event of events) {
        if (event.isDeleted || event.seq !== undoOf) {
          continue;
        }
        event.isDeleted = true;
        const side = sideOfName(event.team ?? undefined, log);
        if (side !== null) {
          withDelta(log, side, event.half, -pointsOfRow(event));
        }
      }
      return;
    }

    if (envelope.type === "possession" && display.event === null) {
      // `home`/`away` only moves the marker: no row, no points. An empty code
      // clears it (the marker went stale), exactly as the projection does.
      const side =
        envelope.code === "home" || envelope.code === "away"
          ? envelope.code
          : null;
      log.inPossession = side === null ? null : teamName(log, side);
      return;
    }

    if (display.event === null) {
      return;
    }

    if (envelope.type === "period" && envelope.code === "half_time") {
      // The same two effects the server applies: the half flips and the marker
      // row appears (once -- a second half-time is a no-op).
      if (!log.isFirstHalf) {
        return;
      }
      log.isFirstHalf = false;
    }

    const side =
      envelope.side === "home" || envelope.side === "away"
        ? envelope.side
        : null;
    const player = coercePlayer(envelope.player);
    // A score is the team's (IFAF R 8-1-1): the jersey is optional detail and
    // never a condition for the points, so the preview promises what the
    // server will store.
    const value = display.value;
    if (side !== null) {
      withDelta(log, side, half, value);
    }
    row(op, display.event, {
      side,
      player,
      input: inputOf(envelope),
      half,
      cop: display.cop,
      excluded: display.excluded,
      payload: envelope.payload ?? null,
    });
  }

  return { log, opByEventId };
}

/**
 * The free-text detail a row shows: the penalty name (`Strafe`), the clock or
 * the kickoff note. Mirrors `TeamLog.input` in the projector.
 */
function inputOf(envelope: EventEnvelope): string | null {
  if (envelope.type === "penalty") {
    return envelope.code ?? null;
  }
  const input = envelope.payload?.input;
  return typeof input === "string" ? input : null;
}

/** The points an existing row contributes; a jersey is optional detail. */
function pointsOfRow(event: GameLogEvent): number {
  // A missed try keeps the try's name but is worth nothing (the server stored
  // value 0 from `payload.missed`), so a correction of that row must not take
  // a point off the score.
  if (event.payload?.missed === true) {
    return 0;
  }
  return SCORING_VALUES[event.event] ?? 0;
}

/** The row's own name is the whole truth; see `app/scoring.ts`. */
const SCORING_VALUES: ScoringValues = DEFAULT_SCORING_VALUES;

function cloneTeam(team: GameLogTeam): GameLogTeam {
  return {
    ...team,
    firsthalf: { ...team.firsthalf, entries: [...team.firsthalf.entries] },
    secondhalf: { ...team.secondhalf, entries: [...team.secondhalf.entries] },
  };
}
