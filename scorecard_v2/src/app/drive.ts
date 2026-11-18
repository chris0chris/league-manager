/**
 * Downs, distance and the spot — the series engine.
 *
 * The scorecard records the play (yards included), so down, distance and the
 * ball's position can be derived from the log instead of being typed.
 *
 * The field is the 50-yard flag-football field: the offence's own goal line is
 * 0, midfield is 25 and the opponent's goal line is 50. The spot is shown the
 * way the officials call it: `A12` is the own 12, `M` is midfield and `B14` is
 * the opponent's 14. A series starts at `A5` and its first line to gain is
 * midfield (`1st & M`); once the ball crosses midfield the line to gain is the
 * goal line (`1st & G`) and the B yards count down to `B0`.
 *
 * The spot only changes when a play moves it or the officials set it (a
 * kickoff, a turnover, a correction) — a **Feldposition** row carries it. It
 * moves the ball and keeps the current down: a correction mid-series must not
 * hand out a fresh set of downs. A **1st** comes from reaching the line to
 * gain (midfield, or the goal line in goal-to-go), a new possession or a
 * marker. A penalty also moves the spot: its structured `yardage` is applied
 * to the current spot, never closer than half the distance to either goal
 * line, and a penalty that pushes the ball across midfield starts a fresh
 * `1st & G`.
 */
import type { GameRules } from "../api/rules";
import type { LogRow } from "../components/EventLog";

export interface DriveState {
  /** 1–4. */
  down: number;
  /** Yards to the line to gain (stored for arithmetic; the UI shows M or G). */
  toGo: number;
  /** 0 (own goal line) to 50 (opponent's), or `null` before it is set. */
  ballOn: number | null;
  /** True once the series' line to gain is the goal line ("& G"). */
  goal: boolean;
  /**
   * `"try"` while the point after a touchdown is being played, absent for a
   * scrimmage series. The try has no down and no line to gain: it ends with
   * its result (+1, +2, a miss or a defensive score), and only then does the
   * ball change hands.
   */
  phase?: "series" | "try";
}

/** The 50-yard field. */
export const FIELD_LENGTH = 50;

/** The line that has to be crossed for the first down of a new series. */
export const MIDFIELD = 25;

/** Every series starts on the offence's own 5-yard line. */
export const SERIES_START = 5;

/**
 * The values the series engine takes from the sport definition
 * (`gameevents/sport/flag_football_5v5.json`, served as
 * `GET /api/config/scorecard/rules`).
 *
 * They are parameters rather than constants so a variant (beach 4v4, flag
 * 7v7) is a data change; {@link DEFAULT_GEOMETRY} is the IFAF 2023 5v5 field
 * and keeps every call site and test that does not pass one on today's field.
 */
export interface Geometry {
  /** The field of play, goal line to goal line. */
  fieldLength: number;
  /** The middle line, the first series' line to gain. */
  middle: number;
  /** Where every series starts. */
  seriesStart: number;
  /** Downs per series. */
  downs: number;
  /**
   * Whether a dead ball **on** the middle line already earns the new series
   * (`"on"`, the operator's call on game 9316) or has to be beyond it
   * (`"beyond"`, IFAF R 5-1-1a's wording). A definition that does not carry
   * the value keeps today's field behaviour, `"on"`.
   */
  middleReached?: "on" | "beyond";
}

/** IFAF 2023, flag football 5v5: 50 yards, middle 25, series at the own 5. */
export const DEFAULT_GEOMETRY: Geometry = {
  fieldLength: FIELD_LENGTH,
  middle: MIDFIELD,
  seriesStart: SERIES_START,
  downs: 4,
  middleReached: "on",
};

/**
 * The engine's values from the served definition, or the defaults.
 *
 * An answer that is not a definition (an older server, a proxy that serves
 * HTML, a test double) must never white-screen the field app, so every value
 * is checked and the defaults win on anything suspicious.
 */
export function geometryOf(rules: GameRules | null | undefined): Geometry {
  if (rules === null || rules === undefined) {
    return DEFAULT_GEOMETRY;
  }
  const field = rules.field;
  const series = rules.series;
  if (field === null || field === undefined || series === null || series === undefined) {
    return DEFAULT_GEOMETRY;
  }
  const { length, middle } = field;
  const { start, downs, middle_reached } = series;
  if (
    !isPositive(length) ||
    !isPositive(middle) ||
    !isPositive(start) ||
    !isPositive(downs) ||
    middle * 2 !== length
  ) {
    return DEFAULT_GEOMETRY;
  }
  return {
    fieldLength: length,
    middle,
    seriesStart: start,
    downs,
    middleReached: middle_reached === "beyond" ? "beyond" : "on",
  };
}

function isPositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** How a penalty changes the down count. */
export type PenaltyNextDown = "repeat" | "first_down" | "loss_of_down";

/** A penalty's structured spot change, or `null` when it carries none. */
export interface PenaltySpot {
  /** Signed from the offence's view: positive moves toward the goal. */
  yardage: number;
  nextDown: PenaltyNextDown;
}

/** Every series starts here; the spot is set by the officials. */
export const FIRST_AND_TEN: DriveState = {
  down: 1,
  toGo: MIDFIELD - SERIES_START,
  ballOn: SERIES_START,
  goal: false,
};

/** The rows a scrimmage play writes (see `PlaySheet`). */
const PLAY_EVENTS = new Set(["Pass", "Pass unvollständig", "Run", "Sack"]);

/** The row that sets the spot (see `FieldPositionSheet`). */
const FIELD_EVENT = "Feldposition";

/** The row whose structured yardage moves the spot (see `PenaltySheet`). */
const PENALTY_EVENT = "Strafe";

/** Rows that end the series and start the next one at the own 5. */
const KICKOFF_EVENTS = new Set([
  "Spiel gestartet",
  "2. Halbzeit gestartet",
  "Spiel beendet",
]);

/** The overtime marker: a fresh series at the middle, goal to go (R 3-1-3c). */
const OVERTIME_EVENT = "Overtime startet";

/** Rows that hand the ball over; the new series starts at the own 5. */
const TURNOVER_EVENTS = new Set(["Turnover", "Interception"]);

/** A safety ends the series too: the defence gets the ball after the kick. */
const SAFETY_EVENTS = new Set(["Safety", "Safety (+1)", "Safety (+2)"]);

/** Yards from the opponent's goal line for the one- and two-point try. */
export const TRY_ONE = 5;
export const TRY_TWO = 10;

/** The rows that end the try. */
const TRY_RESULT_EVENTS = new Set(["1-Extra-Punkt", "2-Extra-Punkte"]);

/** A first down written by hand: it resets the series on the current spot. */
const FIRST_DOWN_EVENT = "First Down";

function clampSpot(value: number, g: Geometry = DEFAULT_GEOMETRY): number {
  return Math.max(0, Math.min(g.fieldLength, value));
}

/**
 * True once the ball has reached the middle line.
 *
 * IFAF R 5-1-1a says the new series is awarded when the dead ball is "beyond
 * the middle"; the definition can set `series.middle_reached` to `"on"` when
 * the league counts the line itself (the operator's call on game 9316), which
 * is the default. Half yards are real (a half-distance penalty produces them),
 * so there is no rounding here.
 */
export function pastMiddle(
  ballOn: number | null,
  g: Geometry = DEFAULT_GEOMETRY,
): boolean {
  if (ballOn === null) {
    return false;
  }
  return g.middleReached === "beyond"
    ? ballOn > g.middle
    : ballOn >= g.middle;
}

/** Yards to the line to gain for a fresh series on this spot. */
export function firstDownDistance(
  ballOn: number | null,
  g: Geometry = DEFAULT_GEOMETRY,
): number {
  if (ballOn === null) {
    return g.middle - g.seriesStart;
  }
  return pastMiddle(ballOn, g) ? g.fieldLength - ballOn : g.middle - ballOn;
}

/** A fresh series on the given spot. */
export function seriesAt(
  ballOn: number | null,
  g: Geometry = DEFAULT_GEOMETRY,
): DriveState {
  return {
    down: 1,
    toGo: firstDownDistance(ballOn, g),
    ballOn,
    goal: pastMiddle(ballOn, g),
  };
}

/**
 * A series whose line to gain is the goal line from the first snap.
 *
 * Overtime starts at the middle with **no first down at the middle** (R
 * 3-1-3c), so the series is goal-to-go even though the spot is not past the
 * line: four downs to score.
 */
export function seriesToGoal(
  ballOn: number,
  g: Geometry = DEFAULT_GEOMETRY,
): DriveState {
  return {
    down: 1,
    toGo: Math.max(0, g.fieldLength - ballOn),
    ballOn,
    goal: true,
  };
}

/**
 * The try after a touchdown: goal to go from B5 (one point) or B10 (two).
 *
 * It is its own phase, not a scrimmage series: it has no down count and only
 * ends with its result, so the ball stays with the scoring team until the
 * conversion (or the miss) is recorded.
 */
export function tryAt(
  ballOn: number = DEFAULT_GEOMETRY.fieldLength - TRY_ONE,
  g: Geometry = DEFAULT_GEOMETRY,
): DriveState {
  const spot = clampSpot(ballOn, g);
  return {
    down: 1,
    toGo: Math.max(0, g.fieldLength - spot),
    ballOn: spot,
    goal: true,
    phase: "try",
  };
}

/** A fresh series on the start spot of this field. */
export function firstAndTen(g: Geometry = DEFAULT_GEOMETRY): DriveState {
  return seriesAt(g.seriesStart, g);
}

/** The state after one play at the current spot. */
export function advance(
  state: DriveState,
  yards: number,
  g: Geometry = DEFAULT_GEOMETRY,
): DriveState {
  if (state.ballOn === null) {
    return {
      ...state,
      down: state.down >= g.downs ? 1 : state.down + 1,
      toGo: Math.max(0, state.toGo - yards),
    };
  }

  const ballOn = clampSpot(state.ballOn + yards, g);

  // A goal-to-go series keeps the goal line as its line to gain, even when a
  // loss carries the ball back across midfield.
  if (state.goal) {
    if (ballOn >= g.fieldLength) {
      return seriesAt(ballOn, g);
    }
    if (state.down >= g.downs) {
      return seriesAt(g.seriesStart, g);
    }
    return {
      down: state.down + 1,
      toGo: g.fieldLength - ballOn,
      ballOn,
      goal: true,
    };
  }

  // Crossing the middle is the first down of the series.
  if (pastMiddle(ballOn, g)) {
    return seriesAt(ballOn, g);
  }
  if (state.down >= g.downs) {
    return seriesAt(g.seriesStart, g);
  }
  return {
    down: state.down + 1,
    toGo: g.middle - ballOn,
    ballOn,
    goal: false,
  };
}

/**
 * The state after the officials set the spot (a **Feldposition** row).
 *
 * A set spot moves the ball — a kickoff, a turnover or, mid-series, a
 * correction — and keeps the current down: only the line to gain follows the
 * ball. Reaching that line is a first down, exactly as a play across it would
 * be; a goal-to-go series keeps the goal line as its line to gain (mirroring
 * {@link advance}), even when the ball is put back behind midfield.
 */
export function placeBall(
  state: DriveState,
  ballOn: number,
  g: Geometry = DEFAULT_GEOMETRY,
  explicit?: { down?: number | null; goal?: boolean | null },
): DriveState {
  // A **Feldposition** row may carry the down and the line to gain the
  // officials set by hand (L1's D4). Those are the correction: they win over
  // the derivation, including the "reaching the line is a first down" rule.
  if (
    (explicit?.down !== undefined && explicit.down !== null) ||
    (explicit?.goal !== undefined && explicit.goal !== null)
  ) {
    const goal = explicit?.goal ?? state.goal;
    const down = explicit?.down ?? state.down;
    const line = goal ? g.fieldLength : g.middle;
    return {
      down,
      toGo: Math.max(0, line - ballOn),
      ballOn,
      goal,
    };
  }

  const line = state.goal ? g.fieldLength : g.middle;
  const reached = state.goal ? ballOn >= line : pastMiddle(ballOn, g);
  if (reached) {
    return seriesAt(ballOn, g);
  }
  return {
    down: state.down,
    toGo: line - ballOn,
    ballOn,
    goal: state.goal,
  };
}

/** True when the play ends the series on downs. */
export function isTurnoverOnDowns(
  state: DriveState,
  yards: number,
  g: Geometry = DEFAULT_GEOMETRY,
): boolean {
  if (state.down !== g.downs) {
    return false;
  }
  if (state.ballOn === null) {
    return state.toGo - yards > 0;
  }
  const ballOn = clampSpot(state.ballOn + yards, g);
  return state.goal
    ? ballOn < g.fieldLength
    : !pastMiddle(ballOn, g);
}

/**
 * Where a penalty leaves the ball, half distance included.
 *
 * Split out of {@link applyPenalty} so the penalty sheet can show the official
 * the *effective* spot instead of the catalogue's nominal yards: at `A5` a
 * five-yard offence penalty moves the ball to `A2,5`, not `A0` (R 10-3-3).
 */
export function enforceSpot(
  ballOn: number | null,
  yardage: number,
  g: Geometry = DEFAULT_GEOMETRY,
): number {
  const spot = ballOn ?? g.seriesStart;
  let after = spot + yardage;
  if (yardage < 0) {
    after = Math.max(after, spot / 2);
  } else if (yardage > 0) {
    after = Math.min(after, (g.fieldLength + spot) / 2);
  }
  return clampSpot(after, g);
}

/**
 * The spot after a penalty.
 *
 * The signed `yardage` moves the ball from the last spot. A penalty may never
 * move the ball closer to either goal than half the remaining distance, so a
 * 5-yard penalty on the 9 leaves the ball on the 4.5 (not the 4). If the
 * result is at or past midfield the series restarts as `1st & G`, whatever
 * `nextDown` says; otherwise `nextDown` decides the down and the line to gain
 * returns to midfield.
 */
export function applyPenalty(
  state: DriveState,
  yardage: number,
  nextDown: PenaltyNextDown = "repeat",
  g: Geometry = DEFAULT_GEOMETRY,
): DriveState {
  // A penalty during the try repeats the try from the enforced spot. It never
  // moves the following series: that starts at the own 5 when the try ends.
  if (state.phase === "try") {
    const spot = enforceSpot(state.ballOn, yardage, g);
    return tryAt(spot, g);
  }

  const ballOn = enforceSpot(state.ballOn, yardage, g);

  let down = state.down;
  if (nextDown === "first_down") {
    down = 1;
  } else if (nextDown === "loss_of_down") {
    down = state.down + 1;
  }

  // A goal-to-go series keeps the goal line as its line to gain, even when a
  // penalty carries the ball back behind the middle (mirror `advance` and
  // `placeBall`). Losing the goal flag here turned `1st & G` into `1st & M`,
  // which is the game-9316 defect.
  if (state.goal) {
    if (down > g.downs) {
      return seriesAt(g.seriesStart, g);
    }
    return {
      down,
      toGo: Math.max(0, g.fieldLength - ballOn),
      ballOn,
      goal: true,
    };
  }

  if (pastMiddle(ballOn, g)) {
    return seriesAt(ballOn, g);
  }

  if (down > g.downs) {
    return seriesAt(g.seriesStart, g);
  }
  return {
    down,
    toGo: g.middle - ballOn,
    ballOn,
    goal: false,
  };
}

/** The same spot seen from the other side. */
export function mirror(
  ballOn: number | null,
  g: Geometry = DEFAULT_GEOMETRY,
): number | null {
  return ballOn === null ? null : g.fieldLength - ballOn;
}

/** The structured down of a **Feldposition** row, when the officials set it. */
export function downOf(
  row: LogRow,
  g: Geometry = DEFAULT_GEOMETRY,
): number | null {
  const down = row.payload?.down;
  if (typeof down !== "number" || !Number.isInteger(down)) {
    return null;
  }
  return down >= 1 && down <= g.downs ? down : null;
}

/** The structured line to gain of a **Feldposition** row (`true` = goal). */
export function goalOf(row: LogRow): boolean | null {
  const goal = row.payload?.goal;
  return typeof goal === "boolean" ? goal : null;
}

/** The structured spot of a **Feldposition** row, or `null`. */
export function spotOf(
  row: LogRow,
  g: Geometry = DEFAULT_GEOMETRY,
): number | null {
  const ballOn = row.payload?.ballOn;
  if (typeof ballOn === "number" && Number.isFinite(ballOn)) {
    return clampSpot(ballOn, g);
  }
  return null;
}

/** The structured spot change of a **Strafe** row, or `null`. */
export function penaltyOf(row: LogRow): PenaltySpot | null {
  if (row.payload === null || row.payload === undefined) {
    return null;
  }
  const yardage = row.payload.yardage;
  if (typeof yardage !== "number" || !Number.isFinite(yardage)) {
    return null;
  }
  const raw = row.payload.nextDown;
  const nextDown: PenaltyNextDown =
    raw === "first_down" || raw === "loss_of_down" ? raw : "repeat";
  return { yardage, nextDown };
}

/**
 * The drive as the log tells it, newest row last.
 *
 * A play belongs to the team that ran it: when the team changes (a touchdown
 * flip, a turnover, a failed fourth down, a manual switch), the new series
 * starts at A5. Markers do the same, and a deleted row does not count at all —
 * an undo rewinds the series. A penalty moves the spot and the down chain
 * without changing possession; a later **Feldposition** row always wins the
 * spot — and, being a correction, keeps the down the log has reached so far.
 */
export function driveAfter(
  rows: LogRow[],
  g: Geometry = DEFAULT_GEOMETRY,
  possession: string | null = null,
): DriveState {
  let state: DriveState = firstAndTen(g);
  let lastTeam: string | null = null;

  for (const row of [...rows].reverse()) {
    if (row.isDeleted) {
      continue;
    }
    if (row.event === "Touchdown") {
      // The try belongs to the scoring team; the ball only changes hands when
      // its result (or a miss, which the screen writes as a possession change)
      // ends it.
      state = tryAt(g.fieldLength - TRY_ONE, g);
      lastTeam = row.team;
      continue;
    }
    if (TRY_RESULT_EVENTS.has(row.event)) {
      // +1/+2 ends the try; the kickoff hands the ball to the other team, so
      // the next series starts at the own 5.
      state = firstAndTen(g);
      lastTeam = row.team;
      continue;
    }
    if (row.event === FIELD_EVENT) {
      const ballOn = spotOf(row, g);
      if (ballOn !== null) {
        const explicit = { down: downOf(row, g), goal: goalOf(row) };
        // A spot set while the try is open ends it (the officials corrected
        // the spot instead of answering the try).
        state =
          state.phase === "try"
            ? placeBall(
                { ...state, phase: undefined, goal: false },
                ballOn,
                g,
                explicit,
              )
            : placeBall(state, ballOn, g, explicit);
      }
      lastTeam = row.team;
      continue;
    }
    if (row.event === FIRST_DOWN_EVENT) {
      state = seriesAt(state.ballOn ?? g.seriesStart, g);
      lastTeam = row.team;
      continue;
    }
    if (row.event === PENALTY_EVENT) {
      const penalty = penaltyOf(row);
      if (penalty !== null) {
        state = applyPenalty(state, penalty.yardage, penalty.nextDown, g);
      }
      continue;
    }
    if (!PLAY_EVENTS.has(row.event)) {
      if (KICKOFF_EVENTS.has(row.event)) {
        state = firstAndTen(g);
        lastTeam = null;
      } else if (row.event === OVERTIME_EVENT) {
        state = seriesToGoal(g.middle, g);
        lastTeam = row.team;
      } else if (row.event === "Interception") {
        // R 5-1-1: the new series starts at the dead-ball spot, not at the own
        // 5. The spot is the intercepting team's own-goal-based position; the
        // sheet writes it, and an older row without one falls back to the own
        // 5 (which is exactly a touchback).
        state = seriesAt(interceptionSpot(row, g), g);
        lastTeam = row.team;
      } else if (TURNOVER_EVENTS.has(row.event)) {
        state = firstAndTen(g);
        lastTeam = row.team;
      } else if (SAFETY_EVENTS.has(row.event)) {
        // The defence scored and receives the free kick: the next series is
        // theirs, from their own 5.
        state = firstAndTen(g);
        lastTeam = row.team;
      }
      continue;
    }
    if (lastTeam !== null && row.team !== lastTeam) {
      // A new possession without a marker: the new offence starts at A5.
      state = firstAndTen(g);
    }
    state = advance(state, yardsOf(row), g);
    lastTeam = row.team;
  }

  // A missed try writes no row; the possession change is what ends it. Until
  // the next series starts (a play resets on the team change), the bar must
  // not keep claiming the try while the other team has the ball.
  if (
    state.phase === "try" &&
    possession !== null &&
    lastTeam !== null &&
    possession !== lastTeam
  ) {
    return firstAndTen(g);
  }
  return state;
}

/**
 * Where the new series starts after an interception.
 *
 * `payload.deadBall` is the spot from the intercepting team's view (A/B, like
 * a **Feldposition** row). A row without it — an older client, or a catch in
 * the end zone that became a touchback — starts at the own 5.
 */
export function interceptionSpot(
  row: LogRow,
  g: Geometry = DEFAULT_GEOMETRY,
): number {
  const deadBall = row.payload?.deadBall;
  if (typeof deadBall === "number" && Number.isFinite(deadBall)) {
    return clampSpot(deadBall, g);
  }
  return g.seriesStart;
}

/**
 * The dead-ball spot of an interception, from the *new* offence's view.
 *
 * The catch and the return are entered in the pre-turnover orientation: A is
 * the throwing offence's own half and B the half it was attacking, so a catch
 * at `B4` is 46 yards from the throwing offence's own goal line. The return
 * gains ground the other way (towards A), so five return yards end the play at
 * `B9` (41) — and the intercepting team, now the offence, starts on its own
 * 9-yard line (`A9`). Only here does the field turn: the dead ball is mirrored
 * into the new offence's view.
 *
 * `null` when the catch spot is unknown (a touchback, or a pick six whose ball
 * is dead in the end zone).
 */
export function interceptionReturnSpot(
  catchOn: number | null,
  returnYards: number | null,
  g: Geometry = DEFAULT_GEOMETRY,
): number | null {
  if (catchOn === null) {
    return null;
  }
  return mirror(clampSpot(catchOn - (returnYards ?? 0), g), g);
}

/** The structured yards of one row; a missing payload counts as no gain. */
export function yardsOf(row: LogRow): number {
  const yards = row.payload?.yards;
  return typeof yards === "number" && Number.isFinite(yards) ? yards : 0;
}

/** `1st & M`, `3rd & M`, `4th & G`, or `Versuch` during the try. */
export function driveText(state: DriveState): string {
  if (state.phase === "try") {
    return "Versuch";
  }
  return `${ordinal(state.down)} & ${state.goal ? "G" : "M"}`;
}

/**
 * The spot suffix of a row's text: `" · A11"`, or `""` before it is set.
 *
 * A play row reads `3rd & M · A11` in the log and the ticker, so the official
 * and the viewer see where the ball is without a second look at the board.
 */
export function driveSpotText(
  state: DriveState,
  g: Geometry = DEFAULT_GEOMETRY,
): string {
  const spot = spotText(state.ballOn, g);
  return spot === null ? "" : ` · ${spot}`;
}

/**
 * `A5`, `M`, `B14` — the spot as the officials call it, `null` when it has not
 * been set. Half yards are shown the German way (`A4,5`).
 */
export function spotText(
  ballOn: number | null,
  g: Geometry = DEFAULT_GEOMETRY,
): string | null {
  if (ballOn === null) {
    return null;
  }
  const spot = clampSpot(ballOn, g);
  if (spot === g.middle) {
    return "M";
  }
  if (spot < g.middle) {
    return `A${formatYards(spot)}`;
  }
  return `B${formatYards(g.fieldLength - spot)}`;
}

/** One decimal at most, in the German comma notation (`4.5` → `4,5`). */
export function formatYards(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return String(rounded).replace(".", ",");
}

function ordinal(down: number): string {
  if (down === 1) {
    return "1st";
  }
  if (down === 2) {
    return "2nd";
  }
  if (down === 3) {
    return "3rd";
  }
  return `${down}th`;
}
