import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
} from "react";

import { RULES_PATH, type GameRules } from "../api/rules";
import type {
  Game,
  GameLog,
  GameLogEventInput,
  GameLogWrite,
  GameSetup,
  Official,
  Penalty,
  RosterPlayer,
  TeamOfficial,
} from "../api/types";
import {
  forgetBreak,
  intermissionSeconds,
  readBreakStart,
  rememberBreakStart,
  secondsLeft,
} from "../app/break";
import {
  advance,
  driveAfter,
  driveSpotText,
  driveText,
  geometryOf,
  isTurnoverOnDowns,
  spotText,
  TRY_ONE,
  TRY_TWO,
} from "../app/drive";
import { readQuarterback, rememberQuarterback } from "../app/quarterback";
import { timeoutBudget, timeoutText } from "../app/timeouts";
import { confirmTap, useWakeLock } from "../app/sideline";
import AppHeader from "../components/AppHeader";
import BreakCountdown from "../components/BreakCountdown";
import EventLog, {
  isMarker,
  logRows,
  undoBody,
  type LogRow,
} from "../components/EventLog";
import ScoreHeader, { isPossessing } from "../components/ScoreHeader";
import { directionFromWire } from "../components/DirectionText";
import GameInfo from "../components/GameInfo";
import SnapshotHint from "../components/SnapshotHint";
import StrandedEntries from "../components/StrandedEntries";
import SyncBadge, { pauseReason, SyncDetails } from "../components/SyncBadge";
import {
  ArrowRight,
  Check,
  Clock,
  Flag,
  Football,
  Interception,
  Pause,
  Play,
  PlusCircle,
  Shield,
  Stopwatch,
  SwapArrows,
  User,
  type IconProps,
} from "../components/icons";
import MoreSheet, { type MoreMode } from "../components/sheets/MoreSheet";
import MoreMenuSheet, {
  type MorePick,
} from "../components/sheets/MoreMenuSheet";
import PenaltySheet, {
  type UnsportsmanlikeRecord,
  unsportsmanlikeRecord,
} from "../components/sheets/PenaltySheet";
import SeriesSheet, {
  seriesEvent,
  type SeriesMode,
} from "../components/sheets/SeriesSheet";
import JerseyPicker from "../components/JerseyPicker";
import QuarterbackPick from "../components/QuarterbackPick";
import ChallengeSheet from "../components/sheets/ChallengeSheet";
import FieldPositionSheet from "../components/sheets/FieldPositionSheet";
import PlaySheet, {
  type PlayResult,
  type PlayType,
} from "../components/sheets/PlaySheet";
import EditSheet from "../components/sheets/EditSheet";
import Sheet from "../components/sheets/Sheet";
import { errorMessage, IgnoredWrite } from "../components/sheets/errors";
import TouchdownSheet from "../components/sheets/TouchdownSheet";
import TimeoutSheet from "../components/sheets/TimeoutSheet";
import HalftimeSheet from "../components/sheets/HalftimeSheet";
import { cachedGet, cachedGetMeta, snapshotKey } from "../offline/snapshot";
import {
  createGameSession,
  type GameSession,
} from "../session/gameSession";
import { getDeviceId } from "../device";
import { lockFrom, takeOver, type LockAnswer } from "../session/lock";
import { getRuntime } from "../session/runtime";
import { undoPossessionTeamOfGroup } from "../session/possessionUndo";
import { eventOfRow } from "../session/events";
import { isStranded, strandedNotice } from "../session/stranded";
import { useSyncStatus, type SyncStatus } from "../session/useSyncStatus";
import { useArmed } from "./useArmed";
import { useTrackingShortcuts } from "./useTrackingShortcuts";

interface TrackingScreenProps {
  game: Game;
  /** Log loaded by the preparation screen; the server payload is the truth. */
  initialLog: GameLog;
  /** Gameday name for the header context line. */
  gamedayName?: string;
  /** League display name for the header context line. */
  leagueLabel?: string;
  /**
   * When the shown log came from the snapshot instead of the network, the age
   * of that stored payload. A game that ended an hour ago then reads as stored
   * data, not as a live one.
   */
  staleSince?: number | null;
  /** Finalise with the log as the screen currently shows it. */
  onFinalize: (log: GameLog) => void;
  /**
   * The write session. The flow passes one when it already built it; without
   * it the screen creates (and owns) its own.
   */
  session?: GameSession;
  /** Header chrome owned by the flow. */
  onBack?: () => void;
  onLogout?: () => void;
}

type Side = RosterPlayer["side"];

/** The open sheet: the touchdown entry, a series/time entry, or a more event. */
type SheetState =
  | { kind: "touchdown" }
  | { kind: "play"; type?: PlayType; result?: PlayResult }
  | { kind: "challenge" }
  | { kind: "fieldpos" }
  | { kind: "series"; mode: SeriesMode }
  | { kind: "penalty" }
  | { kind: "more"; mode: MoreMode }
  | { kind: "moremenu" };

/** The log's event name for each one-tap entry, to find the row it wrote. */
const ONE_TAP_EVENT: Partial<Record<SeriesMode, string>> = {
  first: "First Down",
  turnover: "Turnover",
  interception: "Interception",
};

/**
 * One-tap entries whose jersey is optional: they save on the first tap and
 * their tile offers "Nr. ergänzen" for the second. A Turnover names nobody.
 */
type JerseyLater = "first" | "interception";

function addsJerseyLater(mode: SeriesMode): mode is JerseyLater {
  return mode === "first" || mode === "interception";
}

/**
 * Header title: the field and the round, the two facts an official needs to be
 * sure they opened the right game. `standing` stands in when a game carries no
 * stage (designer-built rows often only have the bracket label).
 */
export function trackingTitle(game: Game): string {
  const stage = game.stage.trim() || game.standing.trim();
  return stage === "" ? `Feld ${game.field}` : `Feld ${game.field} · ${stage}`;
}

/** Header context: gameday and league, each part optional. */
export function trackingSubtitle(
  gamedayName?: string,
  leagueLabel?: string,
): string | undefined {
  const parts = [gamedayName?.trim(), leagueLabel?.trim()].filter(
    (part): part is string => part !== undefined && part !== "",
  );
  return parts.length === 0 ? undefined : parts.join(" · ");
}

const CONFIRMATION: Record<string, string> = {
  Touchdown: "Touchdown gespeichert",
  "First Down": "1st Down gespeichert",
  Turnover: "Turnover gespeichert",
  Interception: "Interception gespeichert",
  Spielzeit: "Spielzeit gespeichert",
  Auszeit: "Auszeit gespeichert",
  Strafe: "Strafe gespeichert",
  "Safety (+1)": "Safety gespeichert",
  "Safety (+2)": "Safety gespeichert",
  Overtime: "Overtime gespeichert",
  Pass: "Pass gespeichert",
  "Pass unvollständig": "Pass gespeichert",
  Run: "Run gespeichert",
  Sack: "Sack gespeichert",
  Challenge: "Challenge gespeichert",
  Feldposition: "Feldposition gespeichert",
  "Overtime starten": "Overtime gestartet",
};

/**
 * Events after which the ball stays where it is.
 *
 * Everything else hands the ball to the other team — a turnover, an
 * interception, a safety and an overtime score all kick off again. v1 also
 * flipped on an `Auszeit`, which was a bug: a timeout is called by the team in
 * possession and does not change it. A touchdown is *not* a ball change any
 * more: the try belongs to the scoring team, so only the try's result flips.
 * A mixed write group (a play and its Turnover row) flips as soon as one of
 * its rows does.
 */
const KEEP_POSSESSION = new Set([
  "Strafe",
  "Spielzeit",
  "Auszeit",
  "First Down",
  // A scrimmage play is the snap itself: the ball stays where it is.
  "Pass",
  "Pass unvollständig",
  "Run",
  "Sack",
  "Challenge",
  "Feldposition",
  "Overtime starten",
  // A touchdown keeps the ball: the try belongs to the scoring team, and the
  // flip is written when the try ends (+1/+2, a miss, a defensive score).
  "Touchdown",
]);

/** Whether a successful write hands the ball to the other team. */
export function flipsPossession(events: GameLogEventInput[]): boolean {
  // True as soon as **one** entry hands the ball over: a failed fourth down
  // writes the play and its Turnover row in one submission, and that mixed
  // submission must flip even though the play alone would keep the ball.
  // A legacy touchdown+conversion submission flips on its conversion.
  return events.some((event) => !KEEP_POSSESSION.has(event.name));
}

/**
 * Read a stored first possession back into a side. v2 writes `home`/`away`,
 * the old app wrote the team name, and `{}` means "no setup".
 */
function setupSide(
  value: string | undefined,
  home: string | null,
  away: string | null,
): Side | null {
  const token = (value ?? "").trim().toLowerCase();
  if (token === "") {
    return null;
  }
  if (token === "home") {
    return "home";
  }
  if (token === "away") {
    return "away";
  }
  if (home !== null && token === home.trim().toLowerCase()) {
    return "home";
  }
  if (away !== null && token === away.trim().toLowerCase()) {
    return "away";
  }
  return null;
}

/**
 * The team that starts the second half: the side that did **not** receive the
 * opening kickoff, exactly like v1 (`Details.handleHalftime` flips
 * `gameSetup.fhPossession`, not the current possession).
 *
 * Returns `null` when the setup carries no usable first possession — the caller
 * then falls back to handing the ball to the other team.
 */
export function secondHalfPossession(
  setup: GameSetup | null | undefined,
  home: string | null,
  away: string | null,
): string | null {
  const first = setupSide(setup?.fhPossession, home, away);
  if (first === null) {
    return null;
  }
  return first === "home" ? away : home;
}

/**
 * The team a submission is recorded for.
 *
 * Everything is credited to the possessing team, except an interception: the
 * defense statistics read the row's team as the team that made the play, and
 * v1 records it for the opponent. Sending the passer would credit every
 * interception to the wrong side.
 *
 * Throws when the write must not happen at all, so the calling sheet keeps its
 * state and shows why.
 */
export function writeTeam(
  events: GameLogEventInput[],
  possession: string | null,
  opponent: string | null,
): string {
  const intercepts = events.some((event) => event.name === "Interception");
  const team = intercepts ? opponent : possession;
  if (possession === null || team === null) {
    throw new IgnoredWrite("Kein Ballbesitz – bitte Team wählen.");
  }
  return team;
}

/** Short confirmation after a write, with the jersey or time it recorded. */
export function describeSaved(events: GameLogEventInput[]): string {
  const [first] = events;
  if (first === undefined) {
    return "Eintrag gespeichert";
  }
  const label = CONFIRMATION[first.name] ?? `${first.name} gespeichert`;
  if (first.input !== undefined) {
    return `${label} · ${first.input}`;
  }
  return first.player === undefined ? label : `${label} · #${first.player}`;
}

/**
 * Live tracking shell: score header, possession switch, the action block, the
 * event log and undo.
 *
 * Every write goes through {@link GameSession}: online it reaches the API and
 * the answer replaces the log; offline (or after a lost answer) it is queued
 * and the screen shows the last server payload plus the queued ops, marked
 * provisional. The score is never recomputed — the field app only adds the
 * queued deltas to the server's score until the next payload replaces both.
 * Undo keeps deleted rows visible and struck through; undoing a row that never
 * left the device removes its queued op instead of calling `DELETE`.
 *
 * Event writes carry the possession team and the half from the payload —
 * never a guess from the current time. The roster is loaded once; without it
 * the touchdown sheet falls back to a numeric jersey field instead of
 * blocking the game.
 */
/**
 * The one place the screen talks about transmission: read-only (another
 * device, an expired session), offline with what is waiting, sending, or
 * "Alles gesendet" for a moment after the queue drained. The app-bar chip
 * only carries the short state, so nothing is said twice.
 */
export function SyncStrip({
  status,
  drained,
  onResume,
  serverLog,
  deviceLog,
  canRelease = false,
  onTakeOver,
}: {
  status: SyncStatus;
  drained: boolean;
  onResume: () => void;
  /** The official log and the device's optimistic one (stranded note). */
  serverLog: GameLog;
  deviceLog: GameLog;
  /** Staff: offer "Spiel übernehmen" for a game another device holds. */
  canRelease?: boolean;
  onTakeOver?: () => Promise<void>;
}) {
  // Taking a game over locks the other device out: the button asks once more.
  const { armed, arm, disarm } = useArmed<"takeover">();
  const confirming = armed === "takeover";
  const [takingOver, setTakingOver] = useState(false);
  const [takeOverError, setTakeOverError] = useState<string | null>(null);
  const waiting =
    status.pending === 1
      ? "1 Eintrag noch nicht übertragen"
      : `${status.pending} Einträge noch nicht übertragen`;
  if (status.paused === "device" || status.paused === "auth") {
    return (
      <div aria-label="Übertragung" className="syncstrip syncstrip-stop" role="status">
        <p className="syncstrip-text">
          {status.paused === "device"
            ? "Nur lesen – das Spiel läuft auf einem anderen Gerät."
            : "Schreiben gesperrt – bitte neu anmelden."}
          {status.paused === "device" && status.pending > 0 ? (
            <span className="syncstrip-sub syncstranded-head">
              {strandedNotice(status.pending)}
            </span>
          ) : null}
          {status.paused === "device" && confirming ? (
            <span className="syncstrip-sub">
              Das andere Gerät kann danach nicht mehr schreiben. Nur
              übernehmen, wenn es ausgefallen ist.
            </span>
          ) : status.paused === "device" && !canRelease ? (
            <span className="syncstrip-sub">
              Die Turnierleitung kann die Gerätesperre aufheben.
            </span>
          ) : null}
          {takeOverError === null ? null : (
            <span className="syncstrip-sub" role="alert">
              {takeOverError}
            </span>
          )}
        </p>
        {status.paused === "device" && status.pending > 0 ? (
          <StrandedEntries
            deviceLog={deviceLog}
            serverLog={serverLog}
            status={status}
          />
        ) : null}
        {status.paused === "device" && canRelease && onTakeOver !== undefined ? (
          <span className="syncstrip-actions">
            <button className="syncstrip-btn" onClick={onResume} type="button">
              Erneut prüfen
            </button>
            <button
              className={
                confirming
                  ? "syncstrip-btn syncstrip-btn-strong is-armed"
                  : "syncstrip-btn"
              }
              disabled={takingOver}
              onClick={() => {
                if (!confirming) {
                  arm("takeover");
                  return;
                }
                disarm();
                setTakingOver(true);
                setTakeOverError(null);
                onTakeOver()
                  .catch((failure: unknown) =>
                    setTakeOverError(
                      errorMessage(
                        failure,
                        "Übernehmen hat nicht geklappt. Bitte erneut versuchen.",
                      ),
                    ),
                  )
                  .finally(() => setTakingOver(false));
              }}
              type="button"
            >
              {takingOver
                ? "Übernehmen …"
                : confirming
                  ? "Übernehmen"
                  : "Spiel übernehmen"}
            </button>
          </span>
        ) : (
          <button className="syncstrip-btn" onClick={onResume} type="button">
            Erneut prüfen
          </button>
        )}
      </div>
    );
  }
  if (status.paused === "offline" || !status.online) {
    return (
      <div aria-label="Übertragung" className="syncstrip syncstrip-off" role="status">
        <p className="syncstrip-text">
          Offline ·{" "}
          {status.pending > 0 ? waiting : "Einträge werden hier gespeichert"}
        </p>
      </div>
    );
  }
  if (status.pending > 0) {
    return (
      <div aria-label="Übertragung" className="syncstrip syncstrip-wait" role="status">
        <p className="syncstrip-text">Spielstand vorläufig · {waiting}</p>
      </div>
    );
  }
  if (drained) {
    return (
      <div aria-label="Übertragung" className="syncstrip syncstrip-ok" role="status">
        <p className="syncstrip-text">✓ Alles gesendet</p>
      </div>
    );
  }
  return null;
}

export default function TrackingScreen({
  game,
  initialLog,
  gamedayName,
  leagueLabel,
  staleSince = null,
  onFinalize,
  session: providedSession,
  onBack,
  onLogout,
}: TrackingScreenProps) {
  const runtime = getRuntime();
  const [session] = useState<GameSession>(
    () =>
      providedSession ??
      createGameSession({
        gameId: game.id,
        initialLog,
        runtime,
      }),
  );
  const [possession, setPossession] = useState<string | null>(
    initialLog.inPossession ?? null,
  );
  const [possessionPending, setPossessionPending] = useState(false);
  const [possessionError, setPossessionError] = useState<string | null>(null);
  const [undoKey, setUndoKey] = useState<string | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);
  // `null` until the roster request settles — an empty array would be a real
  // "no roster" and must not be shown while the fetch is still running.
  const [roster, setRoster] = useState<RosterPlayer[] | null>(null);
  /**
   * The sport definition (IFAF 2023). Until it arrives the engine uses the
   * 50-yard defaults it shipped with, so a slow or missing fetch changes
   * nothing the official sees on the standard field.
   */
  const [rules, setRules] = useState<GameRules | null>(null);
  /**
   * The setup read itself: the first possession decides who starts the second
   * half. The half-time awaits it (it resolved long before, normally) instead
   * of reading a state update that may not have landed yet; a failed read
   * resolves `null` and the half-time falls back to handing the ball to the
   * other team.
   */
  const setupLoad = useRef<Promise<GameSetup | null | undefined> | null>(null);
  const [setup, setSetup] = useState<GameSetup | null>(null);
  const [officials, setOfficials] = useState<Official[] | null>(null);
  const [officialsUnavailable, setOfficialsUnavailable] = useState(false);
  const [people, setPeople] = useState<TeamOfficial[]>([]);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [posting, setPosting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  /** The one-tap entry the toast can still undo or complete, if any. */
  const [quick, setQuick] = useState<SeriesMode | null>(null);
  const [quickError, setQuickError] = useState<string | null>(null);
  /**
   * The touchdown whose extra point is still open: asked once the try has
   * been played, credited to the scoring team with the scorer's jersey (or
   * nobody, when the touchdown was entered without a number).
   */
  const [pendingPat, setPendingPat] = useState<{
    team: string;
    jersey: number | null;
    /** The touchdown's write op, so the try's flip is linked to it. */
    originId?: string;
  } | null>(null);
  /**
   * The try being answered: its team, its points and the default jersey (the
   * touchdown's scorer — he often is the converter). A direct **+1 XP** in
   * overtime opens the same step with no default.
   */
  const [patTry, setPatTry] = useState<{
    team: string;
    points: 1 | 2;
    defaultJersey: number | null;
  } | null>(null);
  const [patJersey, setPatJersey] = useState<number | null>(null);
  /** The try's quarterback; a team may change it just for the conversion. */
  const [patQb, setPatQb] = useState<number | null>(null);
  const [patBusy, setPatBusy] = useState(false);
  /** The try's first answer: focus lands here when the touchdown tile gives way. */
  const patFirst = useRef<HTMLButtonElement>(null);
  const [patError, setPatError] = useState<string | null>(null);
  const [finishBlocked, setFinishBlocked] = useState(false);
  /** The one-tap row a jersey sheet replaces once it saves. */
  const [replacing, setReplacing] = useState<LogRow | null>(null);
  /** The team whose Auszeit dialog is open. */
  const [timeoutTeam, setTimeoutTeam] = useState<string | null>(null);
  /** The half-time confirmation dialog. */
  const [halftimeOpen, setHalftimeOpen] = useState(false);
  /** The log row being corrected in place ("Ändern" next to undo). */
  const [editing, setEditing] = useState<LogRow | null>(null);
  /** Two-step buttons: a one-tap entry offers its jersey, Halbzeit asks once more. */
  const { armed, arm, disarm } = useArmed<JerseyLater | "overtime">();
  const [halftimePending, setHalftimePending] = useState(false);
  const [halftimeError, setHalftimeError] = useState<string | null>(null);
  /**
   * The half-time break runs on this device only: it starts with the marker
   * and is remembered per game, so a reload mid-break keeps counting instead
   * of starting over. A break that already elapsed is dropped on load.
   */
  const [breakStartedAt, setBreakStartedAt] = useState<number | null>(() => {
    const stored = readBreakStart(game.id);
    if (stored === null) {
      return null;
    }
    if (secondsLeft(stored) === 0) {
      forgetBreak(game.id);
      return null;
    }
    return stored;
  });
  // Refs, not state: two taps in the same tick both see the old state and
  // would otherwise fire two writes.
  const possessionInFlight = useRef(false);
  const undoInFlight = useRef(false);
  const postInFlight = useRef(false);
  const halftimeInFlight = useRef(false);

  /**
   * The live log from the session. The subscription also adopts the server's
   * possession marker, except while this screen is changing it (a log answer
   * still describes the state *before* the tap).
   */
  const subscribeLog = useCallback(
    (onStoreChange: () => void) =>
      session.subscribe((next, source) => {
        // Only an authoritative payload may move the possession marker: a
        // write's answer still describes the state before the tap.
        if (
          source === "refresh" &&
          !possessionInFlight.current &&
          Object.prototype.hasOwnProperty.call(next, "inPossession")
        ) {
          setPossession(next.inPossession ?? null);
        }
        onStoreChange();
      }),
    [session],
  );
  const log = useSyncExternalStore(subscribeLog, session.getLog, session.getLog);

  const rows = useMemo(() => logRows(log), [log]);
  /** Down & distance as the log tells it — recomputed on every row change. */
  const geometry = useMemo(() => geometryOf(rules), [rules]);
  /**
   * Every Auszeit still on the board, newest first as the log lists it. The
   * sheet shows both sides so the officials can answer "who took which
   * timeout, and when".
   */
  const timeouts = useMemo(
    () =>
      rows
        .filter((row) => row.event === "Auszeit" && !row.isDeleted)
        .map((row) => ({
          team: row.team ?? "–",
          half: row.half,
          time: row.input ?? "–",
        })),
    [rows],
  );
  /**
   * Every UNV still on the board. The penalty sheet shows the charged team's
   * entries and warns when the current call is the second UNV for a number.
   */
  const unsportsmanlike = useMemo(
    () =>
      rows
        .map(unsportsmanlikeRecord)
        .filter(
          (entry): entry is UnsportsmanlikeRecord => entry !== null,
        ),
    [rows],
  );
  const finished = game.status.trim().toLowerCase() === "beendet";
  const status = useSyncStatus(game.id);
  // A phone that lost the lock still holds its entries. Its main score is the
  // server's; the device's own number is labelled separately in the strip.
  const stranded = isStranded(status);
  const officialLog = stranded ? session.getServerLog() : log;
  // The server said this device may not write (another device holds the game,
  // or the session expired). Read-only with the reason, not a silent failure.
  const readOnly = status.paused === "device" || status.paused === "auth";
  const stopReason = pauseReason(status.paused);
  /** Staff may lift another device's lock ("Spiel übernehmen"). */
  const [canRelease, setCanRelease] = useState(false);


  /**
   * "Alles gesendet" for a moment after the queue drained: the pending count
   * is compared while rendering (React's "adjust state on a changed input"
   * pattern), and only the timeout that hides it again runs in an effect.
   */
  const [prevPending, setPrevPending] = useState(status.pending);
  const [drainTick, setDrainTick] = useState(0);
  const [drained, setDrained] = useState(false);
  if (status.pending !== prevPending) {
    setPrevPending(status.pending);
    if (status.pending === 0 && prevPending > 0 && status.paused === null) {
      setDrained(true);
      setDrainTick((tick) => tick + 1);
    } else if (status.pending > 0) {
      setDrained(false);
    }
  }
  useEffect(() => {
    if (drainTick === 0) {
      return;
    }
    const timer = setTimeout(() => setDrained(false), 2500);
    return () => clearTimeout(timer);
  }, [drainTick]);
  // A tracked game keeps the screen on: the referee looks away for a whole
  // series, and an unlock with gloves or wet hands costs the next entry.
  useWakeLock(!finished);

  useEffect(() => {
    // Warm the penalty catalogue while the network is still there: the sheet
    // may only be opened on the sideline, with no connection left.
    void cachedGet<Penalty[]>(
      snapshotKey.penalties(),
      "/api/config/scorecard/penalties",
    ).catch(() => undefined);
    // The definition decides the field, the series and the penalty numbers;
    // preloaded so a device that loses the network mid-game keeps them.
    void cachedGet<GameRules>(snapshotKey.rules(), RULES_PATH)
      .then(setRules)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    // The roster is the only source for the jersey grid. A failure leaves it
    // empty on purpose: the sheets then offer the numeric fallback.
    cachedGet<RosterPlayer[]>(
      snapshotKey.roster(game.id),
      `/api/game/${game.id}/roster`,
    )
      .then((players) => {
        if (active) {
          setRoster(players ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setRoster([]);
        }
      });
    return () => {
      active = false;
    };
  }, [game.id]);

  useEffect(() => {
    let active = true;
    // Read once, long before the half-time: the setup holds the opening
    // possession, which decides who starts the second half. A failed read
    // stays `null` and the half-time falls back to switching the ball.
    // The same read names this device, so a fresh answer also says whether
    // another device holds the game: read-only on open, not on the first
    // write. A stored (offline) answer never decides the lock.
    const loaded = cachedGetMeta<GameSetup & LockAnswer>(
      snapshotKey.setup(game.id),
      `/api/game/${game.id}/setup`,
      { deviceId: getDeviceId() },
    ).catch(() => null);
    setupLoad.current = loaded.then((answer) => answer?.value ?? null);
    void loaded.then((answer) => {
      if (active) {
        setSetup(answer?.value ?? null);
      }
      // The pre-game quarterback is a typing aid, not game state: seed it
      // into this device's memory so the first pass is one tap shorter. Every
      // device that opens the game gets the same seed from the setup; a QB
      // this device already changed stays as it is.
      const seededHome = answer?.value?.qbHome;
      const seededAway = answer?.value?.qbAway;
      if (
        typeof seededHome === "number" &&
        Number.isFinite(seededHome) &&
        readQuarterback(game.id, "home") === null
      ) {
        rememberQuarterback(game.id, "home", seededHome);
      }
      if (
        typeof seededAway === "number" &&
        Number.isFinite(seededAway) &&
        readQuarterback(game.id, "away") === null
      ) {
        rememberQuarterback(game.id, "away", seededAway);
      }
      const lock = answer?.updatedAt === null ? lockFrom(answer.value) : null;
      if (lock === null || !active) {
        return;
      }
      setCanRelease(lock.canRelease);
      if (lock.lockedElsewhere) {
        getRuntime().sync.pause("device", game.id);
      }
    });
    return () => {
      active = false;
    };
  }, [game.id]);

  useEffect(() => {
    let active = true;
    // The desktop context panel reads the same crew endpoints as preparation.
    // A failed read only leaves its optional list empty; tracking stays usable.
    void Promise.all([
      cachedGet<Official[]>(
        `officials:${game.id}`,
        `/api/game/${game.id}/officials`,
      ).catch(() => null),
      cachedGet<TeamOfficial[]>(
        `official-directory:${game.officialsId}`,
        `/api/officials/team/${game.officialsId}/list`,
      ).catch(() => []),
    ]).then(([crew, directory]) => {
      if (active) {
        setOfficials(crew);
        setOfficialsUnavailable(crew === null);
        setPeople(directory);
      }
    });
    return () => {
      active = false;
    };
  }, [game.id, game.officialsId]);

  /**
   * Ask the server which team holds the ball and take that answer.
   *
   * Used after a failed possession change: the optimistic marker is a guess,
   * the log is the truth. A read that fails too keeps the last known value —
   * the next write or reload corrects it.
   */
  const resyncPossession = async (): Promise<void> => {
    try {
      const fresh = await session.refresh();
      if (Object.prototype.hasOwnProperty.call(fresh, "inPossession")) {
        setPossession(fresh.inPossession ?? null);
      }
    } catch {
      // Keep the local value; nothing else to do here.
    }
  };

  const takePossession = async (
    teamName: string,
    originId?: string,
  ): Promise<void> => {
    if (possessionInFlight.current || teamName === possession || readOnly) {
      return;
    }
    const previous = possession;
    possessionInFlight.current = true;
    disarm();
    setPossession(teamName);
    setPossessionPending(true);
    setPossessionError(null);
    try {
      // Online this is a `PUT`; offline (or after a lost answer) the session
      // queues it and resolves, so the marker stays where the tap put it.
      await session.setPossession(teamName, originId);
    } catch (failure) {
      // Show the correction at once (no flicker), then let the server decide:
      // the `PUT` may have been rejected after it was applied.
      setPossession(previous);
      setPossessionError(
        errorMessage(
          failure,
          "Der Ballbesitz konnte nicht geändert werden. Bitte erneut versuchen.",
        ),
      );
      await resyncPossession();
    } finally {
      possessionInFlight.current = false;
      setPossessionPending(false);
    }
  };

  const undo = async (
    row: LogRow,
    { keepPossession = false }: { keepPossession?: boolean } = {},
  ): Promise<void> => {
    if (undoInFlight.current || halftimePending || readOnly) {
      return;
    }
    undoInFlight.current = true;
    disarm();
    setUndoKey(row.key);
    setUndoError(null);
    try {
      // A row with a synthetic (negative) id never reached the server: the
      // session drops that queued op locally and never sends `DELETE`.
      const local =
        row.teamLogId !== null && row.teamLogId < 0
          ? row.teamLogId
          : undefined;
      // Only a stored, event-sourced row needs the ball put back by the
      // server; a queued row takes its linked flip with it, and an in-place
      // correction already decided where the ball belongs.
      const restore =
        local === undefined && !keepPossession && row.eventSeq !== null
          ? undoPossessionTeamOfGroup(row, rows, log)
          : null;
      await session.undo(
        undoBody(row),
        local,
        restore === null ? undefined : { restorePossessionTo: restore },
      );
      if (local !== undefined) {
        // Removing the entry (and its flip) replayed the server's marker: show
        // that, not the side the now-undone tap had set.
        setPossession(session.getLog().inPossession ?? null);
      } else if (restore !== null) {
        setPossession(restore);
      }
    } catch (failure) {
      setUndoError(
        errorMessage(
          failure,
          "Der Eintrag konnte nicht rückgängig gemacht werden. Bitte erneut versuchen.",
        ),
      );
    } finally {
      undoInFlight.current = false;
      setUndoKey(null);
    }
  };

  /** Open the correction for one log row; nothing to change on a marker. */
  const openEdit = (row: LogRow): void => {
    if (readOnly || finished || row.team === null) {
      return;
    }
    disarm();
    setEditing(row);
  };

  /**
   * Correct a log row: write the same event with the fixed detail, then undo
   * the row that carried the mistake. The write keeps the row's team *and*
   * half, so correcting a first-half entry during the second half does not
   * move the points — and it never flips possession, unlike a fresh play.
   *
   * The correction names the row's event `seq`, which removes the whole
   * submission group: for a v2 game that group is the single play. A row the
   * old app wrote has no event and is not offered for editing at all.
   */
  const submitEdit = async (event: GameLogEventInput): Promise<void> => {
    const row = editing;
    if (row === null || row.team === null) {
      return;
    }
    if (postInFlight.current) {
      throw new IgnoredWrite("Der Eintrag wird gerade gespeichert.");
    }
    if (finished) {
      throw new IgnoredWrite("Dieses Spiel ist beendet.");
    }
    if (readOnly) {
      throw new IgnoredWrite(
        stopReason ?? "Dieses Gerät darf keine Einträge schreiben.",
      );
    }
    postInFlight.current = true;
    setPosting(true);
    disarm();
    try {
      // A submission can write more than one row: a scoring play carries its
      // touchdown. The correction names the group, so it removes all of it -
      // resending only the edited row would delete the touchdown. The group is
      // the **submission** (`groupSequence`), not one event: the play and its
      // touchdown rows have different event ids.
      // `rows` is newest first; reversing restores the order they were sent in.
      const group =
        row.eventSeq === null || row.groupSequence === 0
          ? [row]
          : rows
              .filter(
                (entry) =>
                  !entry.isDeleted &&
                  entry.groupSequence === row.groupSequence,
              )
              .reverse();
      // Compare by key: `rows` is a fresh array on every log change, so the
      // row objects are not identical to the one the sheet was opened with.
      const events = group.map((entry) =>
        entry.key === row.key ? event : eventOfRow(entry),
      );
      await session.writeEvent({
        gameId: game.id,
        team: row.team,
        half: row.half === 2 ? 2 : 1,
        event: events,
      });
      // The replacement already carries the ball's current side.
      await undo(row, { keepPossession: true });
    } finally {
      postInFlight.current = false;
      setPosting(false);
      setEditing(null);
    }
  };

  const logTeamName = (team: typeof log.home): string | null => {
    const name = team.name?.trim();
    return name === undefined || name === "" ? null : name;
  };

  const possessionSide: Side | null =
    possession === null
      ? null
      : isPossessing(log.home, possession)
        ? "home"
        : isPossessing(log.away, possession)
          ? "away"
          : null;

  const opponentSide: Side | null =
    possessionSide === "home"
      ? "away"
      : possessionSide === "away"
        ? "home"
        : null;

  /**
   * Display names resolved through the log, so a possession stored as a team
   * pk still reads "Touchdown Ravens" and not "Touchdown 12".
   */
  const possessionName =
    (possessionSide === "home"
      ? logTeamName(log.home)
      : possessionSide === "away"
        ? logTeamName(log.away)
        : null) ?? possession;
  const opponentName =
    opponentSide === "home" ? logTeamName(log.home) : logTeamName(log.away);
  /**
   * Down & distance as the log tells it — recomputed on every row change. The
   * possession name ends a try whose miss wrote no row (a conversion row ends
   * it on its own).
   */
  const drive = useMemo(
    () => driveAfter(rows, geometry, possessionName),
    [rows, geometry, possessionName],
  );
  /**
   * The spot of the open try: B5 for one point, B10 for two, moved by a penalty
   * the log enforced since the touchdown. `drive.ballOn` carries the enforced
   * spot, but a stale log read can still show the pre-touchdown series, so the
   * delta only applies while the drive really is a try.
   */
  const trySpot = ((): number => {
    const points = patTry?.points === 2 ? 2 : 1;
    const base = geometry.fieldLength - (points === 2 ? TRY_TWO : TRY_ONE);
    if (drive.phase !== "try" || drive.ballOn === null) {
      return base;
    }
    return base + (drive.ballOn - (geometry.fieldLength - TRY_ONE));
  })();
  /** A marker in the log, so the tile flips to +1 XP after every reload. */
  const overtime = rows.some(
    (row) => !row.isDeleted && row.event === "Overtime startet",
  );

  /**
   * Start overtime: a marker event, no score and no new half. The tile then
   * offers **+1 XP** next to the touchdown, as the rules ask.
   */
  const startOvertime = async (): Promise<void> => {
    try {
      await submit([{ name: "Overtime starten" }]);
    } catch (failure) {
      setQuickError(
        errorMessage(
          failure,
          "Die Overtime konnte nicht gestartet werden. Bitte erneut versuchen.",
        ),
      );
    }
  };

  /** The side a team name belongs to (the try's jersey list and QB memory). */
  const patSideOf = (team: string): Side =>
    team === log.away.name ? "away" : "home";
  /** The side that scored the try: its roster feeds the jersey step. */
  const patSide: Side =
    pendingPat === null ? "home" : patSideOf(pendingPat.team);
  const patPlayers =
    roster === null
      ? []
      : roster.filter((player) => player.side === patSide);

  const half = log.isFirstHalf ? 1 : 2;
  // The definition may be missing, stale or not a definition at all (a test
  // double, an old server): the shipped values win over a crash.
  const timeoutsPerHalf = rules?.timeouts?.per_half ?? 2;
  const intermission = intermissionSeconds(rules?.periods?.intermission_minutes);
  /** The side with the ball and what is left of its timeouts this half. */
  const possessionTimeouts =
    possessionName === null
      ? null
      : timeoutBudget(rows, possessionName, half, timeoutsPerHalf);

  /**
   * Write one play. The sheet that called it stays open until this resolves,
   * so a rejected write keeps the picked jersey on screen together with the
   * server's `detail`. A write that must not happen rejects as
   * {@link IgnoredWrite} — resolving would close the sheet and look saved.
   *
   * `team` overrides the possessing team for the entries that are recorded for
   * a team the sheet picked (a penalty charged to the opponent, a safety
   * scored by the defense). Everything else is credited by {@link writeTeam}.
   *
   * A successful write hands the ball over for the change-of-possession events
   * ({@link flipsPossession}); the flip is a separate possession *event*
   * because the server does not move the ball for us. It is awaited so a second
   * tap cannot start from a stale possession, and a failed flip keeps the log
   * (the next reload reads the truth) while showing why.
   */
  const submit = async (
    events: GameLogEventInput[],
    teamOverride?: string,
    {
      /** The ball already moved with the row this write replaces. */
      keepBall = false,
      /**
       * The op the following possession flip belongs to. The try's flip names
       * the touchdown, so undoing the touchdown takes its flip with it even
       * though the conversion was a later write.
       */
      flipOrigin,
    }: { keepBall?: boolean; flipOrigin?: string } = {},
  ): Promise<void> => {
    if (postInFlight.current) {
      throw new IgnoredWrite("Der Eintrag wird gerade gespeichert.");
    }
    if (finished) {
      throw new IgnoredWrite("Dieses Spiel ist beendet.");
    }
    if (possessionSide === null) {
      throw new IgnoredWrite("Kein Ballbesitz – bitte Team wählen.");
    }
    if (readOnly) {
      throw new IgnoredWrite(
        stopReason ?? "Dieses Gerät darf keine Einträge schreiben.",
      );
    }
    const team = teamOverride ?? writeTeam(events, possessionName, opponentName);
    postInFlight.current = true;
    setPosting(true);
    disarm();
    setConfirmation(null);
    setQuick(null);
    setQuickError(null);
    const body: GameLogWrite = {
      gameId: game.id,
      team,
      // Overtime is the third period: it stays inside the second half's block
      // for every reader, but the event store keeps the distinction.
      half: overtime ? 3 : log.isFirstHalf ? 1 : 2,
      event: events,
    };
    try {
      // Online this appends events; offline (or after a lost answer) the
      // session queues the op with its `client_id` and shows it optimistically.
      // The log read after the append is the whole log, so it replaces what is
      // on screen.
      await session.writeEvent(body);
      // The flip written below belongs to this entry, so undoing the row can
      // take exactly that op with it.
      const origin = flipOrigin ?? session.lastOpId() ?? undefined;
      const qb = events.find((event) => typeof event.payload?.qb === "number")
        ?.payload?.qb;
      if (typeof qb === "number" && possessionSide !== null) {
        rememberQuarterback(game.id, possessionSide, qb);
      }
      confirmTap();
      setConfirmation(describeSaved(events));
      if (!keepBall && flipsPossession(events) && opponentName !== null) {
        await takePossession(opponentName, origin);
      }
    } finally {
      postInFlight.current = false;
      setPosting(false);
    }
  };

  /**
   * The team that starts the second half: the side that did **not** receive the
   * opening kickoff, exactly like v1 (`GameSetup.fhPossession`), whatever the
   * last play did — the teams change ends at half-time, so "flip the ball" is
   * only right when the half happened to end with the ball away from the
   * kickoff side. The setup is read once when the screen opens, and the
   * half-time awaits that read; without a usable setup the ball simply goes to
   * the other team.
   */
  const secondHalfTeam = async (): Promise<string | null> => {
    // The read resolved when the screen opened; awaiting it only matters if the
    // half-time is tapped in the first moments of a slow connection, and then
    // it is still better than handing the ball to the wrong team. Awaiting a
    // `null` ref (the effect has not run) simply resolves to "no setup".
    const loaded = await setupLoad.current;
    return (
      secondHalfPossession(loaded, logTeamName(log.home), logTeamName(log.away)) ??
      opponentName
    );
  };

  /**
   * Halbzeit: the server writes the marker (a `period` event) and projects the
   * game into the second half; the possession switch is ours, because the
   * server keeps the first possession.
   *
   * The half is adopted from the log the append answers with, so the next write
   * belongs to the second half. A refused append (409) leaves everything as it
   * was and shows the server's `detail`.
   */
  const startHalftime = async (): Promise<void> => {
    if (halftimeInFlight.current || !log.isFirstHalf || readOnly) {
      return;
    }
    if (possessionInFlight.current) {
      // Without this the flip below would silently do nothing and the second
      // half would start with whoever the manual change left in possession.
      setHalftimeError(
        "Der Ballbesitz wird gerade geändert. Bitte kurz warten.",
      );
      return;
    }
    halftimeInFlight.current = true;
    setHalftimePending(true);
    setHalftimeError(null);
    disarm();
    try {
      // Online an event append whose answer carries the flipped half; offline
      // the op is queued and the half flips locally so the next entry already
      // belongs to the second half.
      await session.halftime();
    } catch (failure) {
      setHalftimeError(
        errorMessage(
          failure,
          "Die Halbzeit konnte nicht gestartet werden. Bitte erneut versuchen.",
        ),
      );
      halftimeInFlight.current = false;
      setHalftimePending(false);
      return;
    }
    setBreakStartedAt(rememberBreakStart(game.id));
    const target = await secondHalfTeam();
    if (target !== null) {
      await takePossession(target);
    }
    halftimeInFlight.current = false;
    setHalftimePending(false);
    setHalftimeOpen(false);
  };

  const openSheet = (next: SheetState): void => {
    disarm();
    setConfirmation(null);
    setQuick(null);
    setQuickError(null);
    setSheet(next);
  };

  /** A row of the **Mehr** menu opens the sheet it replaces. */
  const pickFromMenu = (pick: MorePick): void => {
    if (pick === "overtime") {
      setSheet(null);
      if (overtime) {
        openSinglePat();
      } else {
        void startOvertime();
      }
      return;
    }
    if (pick === "safety") {
      setSheet({ kind: "more", mode: "safety" });
      return;
    }
    if (pick === "challenge") {
      setSheet({ kind: "challenge" });
      return;
    }
    if (pick === "fieldpos") {
      setSheet({ kind: "fieldpos" });
      return;
    }
    if (pick === "touchdown") {
      setSheet({ kind: "touchdown" });
      return;
    }
    setSheet({ kind: "series", mode: pick });
  };

  /** The newest live row a one-tap entry wrote (rows are newest first). */
  const quickRow = (mode: SeriesMode): LogRow | null =>
    rows.find(
      (row) => !row.isDeleted && row.event === ONE_TAP_EVENT[mode],
    ) ?? null;

  /**
   * Save an entry that needs no input on the tap itself. A wrong tap is one
   * "Rückgängig" away in the toast, which is cheaper than a sheet on every
   * correct one. An entry with an optional jersey then arms its tile: tapping
   * it again within the window adds the jersey, right where the official's
   * finger already is.
   */
  const recordOneTap = async (mode: SeriesMode): Promise<void> => {
    try {
      await submit([seriesEvent(mode, null)]);
      setQuick(mode);
      if (addsJerseyLater(mode)) {
        arm(mode);
      }
    } catch (failure) {
      setQuickError(
        errorMessage(
          failure,
          "Der Eintrag konnte nicht gespeichert werden. Bitte erneut versuchen.",
        ),
      );
    }
  };

  const undoQuick = (mode: SeriesMode): void => {
    const row = quickRow(mode);
    setQuick(null);
    setConfirmation(null);
    if (row !== null) {
      void undo(row);
    }
  };

  /** Open the entry's sheet; saving it replaces the one-tap row. */
  const completeQuick = (mode: SeriesMode): void => {
    setReplacing(quickRow(mode));
    openSheet({ kind: "series", mode });
  };

  /** A series tile, tapped or keyed: an armed tile adds the jersey. */
  const tapSeriesTile = (mode: SeriesMode, oneTap: boolean): void => {
    if (addsJerseyLater(mode) && armed === mode) {
      completeQuick(mode);
    } else if (oneTap) {
      void recordOneTap(mode);
    } else {
      openSheet({ kind: "series", mode });
    }
  };

  const closeSheet = (): void => {
    setSheet(null);
    setReplacing(null);
  };

  /** The touchdown sheet's write; on success the extra point is asked next. */
  /**
   * The touchdown sheet's write; on success the extra point is asked next —
   * also for a team touchdown entered without a number (IFAF R 8-1-1).
   */
  const submitTouchdown = async (events: GameLogEventInput[]): Promise<void> => {
    const team = possessionName;
    await submit(events);
    // The touchdown does not flip the ball any more; its op is what the try's
    // flip will name so undoing the touchdown takes the flip with it.
    const originId = session.lastOpId() ?? undefined;
    const jersey = events[0]?.player;
    if (team !== null) {
      setPendingPat({
        team,
        jersey: typeof jersey === "number" ? jersey : null,
        originId,
      });
      setPatTry(null);
      setPatJersey(null);
      setPatQb(readQuarterback(game.id, patSideOf(team)));
      setPatError(null);
      setFinishBlocked(false);
    }
  };

  /** Forget the open try (a miss, a saved conversion, a new touchdown). */
  const closePat = (): void => {
    setPendingPat(null);
    setPatTry(null);
    setPatJersey(null);
    setPatQb(null);
    setFinishBlocked(false);
  };

  /** Write the conversion for the chosen jersey, or for nobody. */
  const writePat = async (jersey: number | null): Promise<void> => {
    if (patTry === null || patBusy) {
      return;
    }
    setPatBusy(true);
    setPatError(null);
    try {
      const event: GameLogEventInput = {
        name: patTry.points === 1 ? "1-Extra-Punkt" : "2-Extra-Punkte",
      };
      if (jersey !== null) {
        event.player = jersey;
      }
      if (patQb !== null) {
        event.payload = { qb: patQb };
      }
      await submit([event], patTry.team, {
        flipOrigin: pendingPat?.originId,
      });
      closePat();
    } catch (failure) {
      setPatError(
        errorMessage(
          failure,
          "Der Extrapunkt konnte nicht gespeichert werden. Bitte erneut versuchen.",
        ),
      );
    } finally {
      setPatBusy(false);
    }
  };

  /**
   * The try's result. `nicht verwandelt` ends the try and hands the ball over
   * without a row (the miss itself is no game event); +1/+2 open the jersey
   * step, pre-selected with the touchdown's scorer.
   */
  const answerPat = (points: 0 | 1 | 2): void => {
    if (pendingPat === null || patBusy) {
      return;
    }
    if (points === 0) {
      // The flip is the only record a missed try leaves - linked to the
      // touchdown's op, so undoing the touchdown also puts the ball back. The
      // prompt closes at once; the switch itself paints optimistically.
      const originId = pendingPat.originId;
      closePat();
      if (opponentName !== null) {
        void takePossession(opponentName, originId);
      }
      return;
    }
    setPatTry({
      team: pendingPat.team,
      points,
      defaultJersey: pendingPat.jersey,
    });
    setPatJersey(pendingPat.jersey);
    setPatQb(readQuarterback(game.id, patSideOf(pendingPat.team)));
    setPatError(null);
  };

  /**
   * The defence scored on the try (IFAF R 8-1-1: two points).
   *
   * The row goes to the **defending** team, i.e. the opponent of the side that
   * scored the touchdown - the ball still belongs to the scoring team until
   * the try ends. `try_defense` in the payload is what tells a later statistics
   * pass that these two points were not a converted two-point try.
   */
  const writeDefensiveTry = async (): Promise<void> => {
    const defence = opponentName;
    if (pendingPat === null || patBusy || defence === null) {
      return;
    }
    setPatBusy(true);
    setPatError(null);
    try {
      await submit(
        [
          {
            name: "2-Extra-Punkte",
            input: "Gegner",
            payload: { try_defense: true },
          },
        ],
        defence,
        { flipOrigin: pendingPat.originId },
      );
      closePat();
    } catch (failure) {
      setPatError(
        errorMessage(
          failure,
          "Der Punkt für den Gegner konnte nicht gespeichert werden. Bitte erneut versuchen.",
        ),
      );
    } finally {
      setPatBusy(false);
    }
  };

  /** Overtime's **+1 XP**: the same jersey step, without a touchdown behind it. */
  const openSinglePat = (): void => {
    if (possessionName === null) {
      return;
    }
    setPatTry({ team: possessionName, points: 1, defaultJersey: null });
    setPatJersey(null);
    setPatQb(readQuarterback(game.id, possessionSide ?? patSideOf(possessionName)));
    setPatError(null);
  };

  useEffect(() => {
    if (pendingPat !== null && patTry === null) {
      patFirst.current?.focus();
    }
  }, [pendingPat, patTry]);

  /** "Spiel beenden" waits for an open extra point instead of dropping it. */
  const finish = (): void => {
    if (pendingPat !== null) {
      setFinishBlocked(true);
      return;
    }
    forgetBreak(game.id);
    onFinalize(log);
  };

  /** Recent jerseys of the side with the ball, newest first, for the chips. */
  const recentJerseys: number[] = [];
  for (const row of rows) {
    if (
      !row.isDeleted &&
      row.player !== null &&
      row.team === possessionName &&
      !recentJerseys.includes(row.player)
    ) {
      recentJerseys.push(row.player);
    }
  }

  /**
   * A scrimmage play: `submit` writes it, then the down & distance moves on.
   *
   * The resulting state is appended to the row's text (so the log and the
   * ticker show "3rd & 4"), and a failed fourth down writes a **Turnover** row
   * that says why the ball changed hands. The row shares the play's submission
   * (and therefore its undo group), and the possession flip it triggers
   * carries that group's origin, so one undo removes the play, the turnover
   * row and the flip.
   */
  const submitPlay = async (events: GameLogEventInput[]): Promise<void> => {
    const [play, ...rest] = events;
    if (play === undefined) {
      return;
    }
    const scoringTeam = possessionName;
    const yards =
      typeof play.payload?.yards === "number" ? play.payload.yards : 0;
    const next = advance(drive, yards, geometry);
    const turnover = isTurnoverOnDowns(drive, yards, geometry);
    const detail = play.input === undefined ? "" : `${play.input} · `;
    // Safety and interception rows belong to the **defence**; the play stays
    // with the offence, so they are written in a second submission.
    const changesHands = rest.some((event) => event.payload?.defense === true);
    const written: GameLogEventInput[] = [
      { ...play, input: `${detail}${driveText(next)}${driveSpotText(next, geometry)}` },
      ...rest,
    ];
    if (turnover && !changesHands) {
      written.push({
        name: "Turnover",
        input: "4th down",
        payload: { reason: "downs" },
      });
    }
    const offense = written.filter(
      (event) => event.payload?.defense !== true,
    );
    const defense = written.filter(
      (event) => event.payload?.defense === true,
    );
    await submit(offense);
    // A play that scored carries its own touchdown row, so the try is asked
    // right away - the same prompt a touchdown tile produces. A team score
    // without a number still asks: the six points stand (IFAF R 8-1-1).
    const scored = offense.find((event) => event.name === "Touchdown");
    if (scored !== undefined && scoringTeam !== null) {
      const jersey =
        typeof scored.player === "number" ? scored.player : play.player;
      setPendingPat({
        team: scoringTeam,
        jersey: typeof jersey === "number" ? jersey : null,
        originId: session.lastOpId() ?? undefined,
      });
      setPatTry(null);
      setPatJersey(null);
      setPatQb(readQuarterback(game.id, patSideOf(scoringTeam)));
      setPatError(null);
      setFinishBlocked(false);
    }
    if (defense.length > 0 && opponentName !== null) {
      await submit(defense, opponentName);
      // A pick six belongs to the defence, and its try follows for them.
      const defensiveScore = defense.find(
        (event) => event.name === "Touchdown",
      );
      if (defensiveScore !== undefined) {
        const jersey =
          typeof defensiveScore.player === "number"
            ? defensiveScore.player
            : null;
        setPendingPat({
          team: opponentName,
          jersey,
          originId: session.lastOpId() ?? undefined,
        });
        setPatTry(null);
        setPatJersey(null);
        setPatQb(readQuarterback(game.id, patSideOf(opponentName)));
        setPatError(null);
        setFinishBlocked(false);
      }
    }
  };

  /**
   * One tap on a team's timeout: the row belongs to that team, whoever has the
   * ball (meeting 2026-11-05, 57:33-59:08). No time is asked - the date and
   * the order of the log are the record, and a typed clock would be one tap
   * more on the common path. A wrong tap is undone from its row.
   */
  const takeTimeout = async (
    team: string,
    gameTime: string | null = null,
  ): Promise<void> => {
    const event: GameLogEventInput = { name: "Auszeit" };
    if (gameTime !== null) {
      event.input = gameTime;
    }
    await submit([event], team);
  };

  /** A sheet that completes a one-tap entry writes the new row, then undoes the old. */
  const submitSeries = async (events: GameLogEventInput[]): Promise<void> => {
    const previous = replacing;
    // A replacement belongs to the replaced row's team, and the ball already
    // moved with that row (an interception): it must not move twice.
    await submit(events, previous?.team ?? undefined, {
      keepBall: previous !== null,
    });
    if (previous !== null) {
      setReplacing(null);
      // The replacement kept the ball where the replaced row left it.
      await undo(previous, { keepPossession: true });
    }
  };

  // Nothing happens between the touchdown and the try, except a penalty: a
  // foul during the try is enforced on the try itself, so the flag must stay
  // reachable while the prompt is open.
  const penaltyDisabled =
    posting ||
    possessionPending ||
    halftimePending ||
    finished ||
    readOnly ||
    possessionSide === null ||
    possessionName === null;
  const composerDisabled =
    pendingPat !== null ||
    posting ||
    possessionPending ||
    halftimePending ||
    finished ||
    readOnly ||
    possessionSide === null ||
    possessionName === null;
  const touchdownLabel =
    possessionName === null ? "Touchdown" : `Touchdown ${possessionName}`;
  /**
   * Starting the half writes two things in a row (the marker, then the ball).
   * A possession change or an undo still on its way would land in between and
   * either skip the flip or answer with a stale half, so the block waits.
   */
  const halftimeDisabled =
    pendingPat !== null ||
    halftimePending ||
    posting ||
    possessionPending ||
    undoKey !== null ||
    readOnly;

  useTrackingShortcuts({
    readOnly: readOnly || finished,
    sheetOpen:
      sheet !== null ||
      pendingPat !== null ||
      editing !== null ||
      timeoutTeam !== null ||
      halftimeOpen,
    onTouchdown: () => {
      if (!composerDisabled && pendingPat === null) {
        openSheet({ kind: "touchdown" });
      }
    },
    onPlay: () => {
      if (!composerDisabled) {
        openSheet({ kind: "play", type: "pass" });
      }
    },
    onAction: (index) => {
      // Only the penalty (index 4) stays reachable while the try is open (a
      // foul during the try is enforced on it); every other entry waits.
      if (composerDisabled && index !== 4) {
        return;
      }
      if (index === 0) {
        openSheet({ kind: "play", type: "pass" });
      } else if (index === 1) {
        openSheet({ kind: "play", type: "run" });
      } else if (index === 2) {
        openSheet({ kind: "play", type: "sack" });
      } else if (index === 3) {
        openSheet({
          kind: "play",
          type: "pass",
          result: "interception",
        });
      } else if (index === 4) {
        if (!penaltyDisabled) {
          openSheet({ kind: "penalty" });
        }
      } else if (index === 5) {
        openSheet({ kind: "series", mode: "time" });
      } else if (index === 6) {
        openSheet({ kind: "moremenu" });
      } else if (index === 7) {
        tapSeriesTile("first", true);
      } else if (index === 8) {
        tapSeriesTile("turnover", true);
      } else if (index === 9) {
        openSheet({ kind: "more", mode: "safety" });
      } else if (index === 10) {
        if (overtime) {
          openSinglePat();
        } else if (armed === "overtime") {
          void startOvertime();
        } else {
          arm("overtime");
        }
      }
    },
    onSwitchPossession: () => {
      if (
        opponentName !== null &&
        !posting &&
        !possessionPending &&
        !halftimePending
      ) {
        void takePossession(opponentName);
      }
    },
    onUndo: () => {
      const newest = rows.find((row) => !row.isDeleted && !isMarker(row));
      if (newest !== undefined) {
        void undo(newest);
      }
    },
  });

  return (
    <div className="app-shell tracking">
      <AppHeader
        badge={
          <SyncBadge gameId={game.id} status={status} variant="inline" />
        }
        onBack={onBack}
        onLogout={onLogout}
        sub={trackingSubtitle(gamedayName, leagueLabel)}
        title={trackingTitle(game)}
      />
      <SyncDetails gameId={game.id} status={status} withReason={false} />
      <SnapshotHint updatedAt={staleSince} />
      <SyncStrip
        canRelease={canRelease}
        deviceLog={log}
        drained={drained}
        onResume={() => void status.resume()}
        onTakeOver={async () => {
          await takeOver(game.id);
          await status.resume();
        }}
        serverLog={officialLog}
        status={status}
      />
      <main aria-label="Spiel erfassen" className="tracking-layout">
        <GameInfo
          game={game}
          log={log}
          officials={officials}
          officialsUnavailable={officialsUnavailable}
          people={people}
          setup={setup}
        />
        <div className="tracking-controls">
      <ScoreHeader
        away={officialLog.away}
        disabled={possessionPending || halftimePending || readOnly}
        home={officialLog.home}
        isFirstHalf={officialLog.isFirstHalf}
        onPossession={(team) => void takePossession(team)}
        onTimeout={(team) => setTimeoutTeam(team)}
        possession={possession}
        timeoutDisabled={
          posting ||
          possessionPending ||
          halftimePending ||
          finished ||
          readOnly
        }
        timeouts={(team) => {
          const name = logTeamName(team);
          return name === null
            ? null
            : timeoutBudget(rows, name, half, timeoutsPerHalf);
        }}
      />
      <div className="drivebar">
        <p aria-live="polite" className="driveline">
          {pendingPat === null
            ? `${driveText(drive)}${
                spotText(drive.ballOn, geometry) === null
                  ? ""
                  : ` · ${spotText(drive.ballOn, geometry)}`
              }`
            : // the try is its own down: from B5 (one point) or B10 (two),
              // moved by a penalty the log enforced during the try
              `Versuch · ${spotText(trySpot, geometry)}`}
        </p>
        <button
          className="driveset"
          disabled={readOnly || finished}
          onClick={() => openSheet({ kind: "fieldpos" })}
          type="button"
        >
          Feldposition
        </button>
      </div>
      {possessionError === null || readOnly ? null : (
        <p className="trackerror" role="alert">
          {possessionError}
        </p>
      )}
      {finished ? (
        <p className="finishednote" role="status">
          Dieses Spiel ist beendet.
        </p>
      ) : possessionName === null ? (
        <p className="trackhint">Ballbesitz wählen, um Einträge zu erfassen.</p>
      ) : null}
        </div>
      {/* The log owns the free height; the saved strip takes its own line
          below the log instead of covering the newest rows. */}
      <div className="logwrap tracking-log">
        <EventLog
          disabled={halftimePending || readOnly || finished}
          error={undoError}
          onEdit={readOnly || finished ? undefined : openEdit}
          onUndo={(row) => void undo(row)}
          rows={rows}
          undoKey={undoKey}
        />
        {confirmation === null || pendingPat !== null ? null : (
          <div aria-label="Gespeichert" className="trackok" role="status">
            <span className="trackok-text">{confirmation}</span>
            {quick === null ? null : (
              <span className="trackok-actions">
                <button
                  className="trackok-btn"
                  disabled={undoKey !== null}
                  onClick={() => undoQuick(quick)}
                  type="button"
                >
                  Rückgängig
                </button>
              </span>
            )}
          </div>
        )}
        {quickError === null || readOnly ? null : (
          <p className="trackerror" role="alert">
            {quickError}
          </p>
        )}
      </div>
      <section
        aria-label="Einträge"
        className={possessionSide === null ? "actions" : `actions ${possessionSide}`}
      >
        {/* The try comes before any other score: while its result is open,
            the extra point takes the touchdown button's place. */}
        {pendingPat !== null ? (
            <div
              aria-label={`Extrapunkt ${pendingPat.team}`}
              className="patbar"
              role="group"
            >
              <p className="patbar-q">
                Extrapunkt {pendingPat.team} ·{" "}
                {pendingPat.jersey === null
                  ? "ohne Nummer"
                  : `#${pendingPat.jersey}`}{" "}
                – Ergebnis des Versuchs?
              </p>
              <div className="patbar-opts">
                {(
                  overtime
                    ? ([[1, "+1"], [0, "nicht verwandelt"]] as const)
                    : ([[1, "+1"], [2, "+2"], [0, "nicht verwandelt"]] as const)
                ).map(([points, label]) => (
                  <button
                    aria-pressed={false}
                    className="choice choice-dark"
                    disabled={patBusy || readOnly}
                    key={label}
                    onClick={() => answerPat(points)}
                    ref={points === 1 ? patFirst : undefined}
                    type="button"
                  >
                    <span className={points === 0 ? "choice-label" : "choice-num"}>
                      {label}
                    </span>
                  </button>
                ))}
                <button
                  aria-pressed={false}
                  className="choice choice-dark"
                  disabled={patBusy || readOnly || possessionName === null}
                  onClick={() => void writeDefensiveTry()}
                  type="button"
                >
                  <span className="choice-label">Gegner +2</span>
                </button>
              </div>
              {patError === null ? null : (
                <p className="patbar-err" role="alert">
                  {patError}
                </p>
              )}
            </div>
        ) : (
          <button
            className={
              possessionSide === null ? "tdbtn" : `tdbtn ${possessionSide}`
            }
            disabled={composerDisabled}
            onClick={() => openSheet({ kind: "touchdown" })}
            type="button"
          >
            <Football className="tdbtn-icon" size={26} />
            <span className="tdbtn-label">{touchdownLabel}</span>
            <kbd aria-hidden="true" className="shortcut-hint" data-key="T" />
          </button>
        )}
        <div className="action-grid">
          {(
            [
              { type: "pass", label: "Pass", Icon: Play },
              { type: "run", label: "Run", Icon: ArrowRight },
              { type: "sack", label: "Sack", Icon: Shield },
              {
                type: "pass",
                result: "interception",
                label: "Interception",
                Icon: Interception,
              },
            ] as {
              type: PlayType;
              result?: PlayResult;
              label: string;
              Icon: ComponentType<IconProps>;
            }[]
          ).map(({ type, result, label, Icon }, index) => (
            <button
              className="action"
              disabled={composerDisabled}
              key={label}
              onClick={() =>
                openSheet({ kind: "play", type, result })
              }
              type="button"
            >
              <Icon className="action-icon" size={20} />
              <span>{label}</span>
              <kbd
                aria-hidden="true"
                className="shortcut-hint"
                data-key={index + 1}
              />
            </button>
          ))}
          <button
            className="action"
            disabled={penaltyDisabled}
            onClick={() => openSheet({ kind: "penalty" })}
            type="button"
          >
            <Flag className="action-icon" size={20} />
            <span>Strafe</span>
            <kbd aria-hidden="true" className="shortcut-hint" data-key="5" />
          </button>
          <button
            className="action"
            disabled={composerDisabled}
            onClick={() => openSheet({ kind: "series", mode: "time" })}
            type="button"
          >
            <Stopwatch className="action-icon" size={20} />
            <span>Spielzeit</span>
            <kbd aria-hidden="true" className="shortcut-hint" data-key="6" />
          </button>
          <button
            className="action"
            disabled={composerDisabled}
            onClick={() => setTimeoutTeam(possessionName)}
            type="button"
          >
            <Clock className="action-icon" size={20} />
            <span>Auszeit</span>
            {possessionTimeouts === null ? null : (
              <span aria-hidden="true" className="actioncount">
                {timeoutText(possessionTimeouts)}
              </span>
            )}
          </button>
          <button
            className="action"
            disabled={composerDisabled}
            onClick={() => openSheet({ kind: "moremenu" })}
            type="button"
          >
            <PlusCircle className="action-icon" size={20} />
            <span>Mehr</span>
            <kbd aria-hidden="true" className="shortcut-hint" data-key="7" />
          </button>
          <button
            className={armed === "first" ? "action is-armed" : "action"}
            disabled={composerDisabled}
            onClick={() => tapSeriesTile("first", true)}
            type="button"
          >
            {armed === "first" ? (
              <User className="action-icon" size={20} />
            ) : (
              <ArrowRight className="action-icon" size={20} />
            )}
            <span>{armed === "first" ? "Nr. ergänzen" : "1st Down"}</span>
            <kbd aria-hidden="true" className="shortcut-hint" data-key="8" />
          </button>
          <button
            className="action"
            disabled={composerDisabled}
            onClick={() => tapSeriesTile("turnover", true)}
            type="button"
          >
            <SwapArrows className="action-icon" size={20} />
            <span>Turnover</span>
            <kbd aria-hidden="true" className="shortcut-hint" data-key="9" />
          </button>
          <button
            className="action"
            disabled={composerDisabled}
            onClick={() => openSheet({ kind: "more", mode: "safety" })}
            type="button"
          >
            <Shield className="action-icon" size={20} />
            <span>Safety</span>
            <kbd aria-hidden="true" className="shortcut-hint" data-key="0" />
          </button>
          <button
            className={armed === "overtime" ? "action is-armed" : "action"}
            disabled={composerDisabled}
            onClick={() => {
              if (overtime) {
                openSinglePat();
              } else if (armed === "overtime") {
                void startOvertime();
              } else {
                arm("overtime");
              }
            }}
            type="button"
          >
            <PlusCircle className="action-icon" size={20} />
            <span>
              {overtime
                ? "+1 XP"
                : armed === "overtime"
                  ? "Overtime starten"
                  : "Overtime"}
            </span>
          </button>
        </div>
      </section>
        <div
          aria-label="Spielabschluss"
          className={
            possessionSide === null
              ? "tracking-end"
              : `tracking-end ${possessionSide}`
          }
          role="group"
        >
        {log.isFirstHalf && !finished ? (
        <section aria-label="Halbzeit" className="halfblock">
          <button
            className="halfbtn"
            disabled={halftimeDisabled}
            onClick={() => {
              setHalftimeError(null);
              setHalftimeOpen(true);
            }}
            type="button"
          >
            <Pause size={18} />
            {halftimePending ? "Halbzeit …" : "Halbzeit"}
          </button>
          {halftimeError === null || halftimeOpen ? null : (
            <p className="trackerror" role="alert">
              {halftimeError}
            </p>
          )}
        </section>
      ) : null}
      {!log.isFirstHalf && breakStartedAt !== null && !finished ? (
        <BreakCountdown
          totalSeconds={intermission}
          onDone={() => {
            forgetBreak(game.id);
            setBreakStartedAt(null);
          }}
          startedAt={breakStartedAt}
        />
      ) : null}
      <footer className="trackfoot">
        {finished ? null : (
          <button
            className="startbtn"
            disabled={readOnly}
            onClick={finish}
            type="button"
          >
            <Check size={20} />
            Spiel beenden
          </button>
        )}
        {finishBlocked ? (
          <p className="trackerror" role="alert">
            Extrapunkt nach dem Touchdown noch offen – bitte oben eintragen
            oder „nicht verwandelt“ wählen.
          </p>
        ) : null}
      </footer>
        </div>
        <p aria-live="polite" className="sr-only">
          {armed === "overtime"
            ? "Zum Bestätigen erneut tippen"
            : ""}
        </p>
      </main>

      {patTry !== null ? (
        <Sheet
          busy={patBusy}
          error={patError}
          footer={
            <button
              className="startbtn"
              disabled={patBusy || readOnly}
              onClick={() => {
                void writePat(patJersey);
              }}
              type="button"
            >
              {patBusy ? "Speichern …" : "Speichern"}
            </button>
          }
          onClose={() => {
            setPatTry(null);
            setPatError(null);
          }}
          title={`Extrapunkt ${patTry.team}`}
        >
          <p className="sheetnote">
            {patTry.defaultJersey === null
              ? "Wer hat den Extrapunkt verwandelt?"
              : `Wer hat den Extrapunkt verwandelt? Der Touchdown-Schütze ist vorausgewählt (#${patTry.defaultJersey}).`}
          </p>
          <JerseyPicker
            disabled={patBusy || readOnly}
            groupLabel="Trikotnummer Extrapunkt"
            label="Trikot"
            onChange={setPatJersey}
            optionalLabel="Ohne Nummer"
            players={patPlayers}
            strict={game.passcheck === true}
            value={patJersey}
          />
          <h3 className="sheetsection">Quarterback</h3>
          <QuarterbackPick
            disabled={patBusy || readOnly}
            onChange={setPatQb}
            roster={roster}
            side={patSide}
            value={patQb}
          />
        </Sheet>
      ) : null}

      {editing !== null ? (
        <EditSheet
          // A second edit of another row starts from that row, not the last one.
          key={editing.key}
          event={editing.event}
          half={editing.half}
          input={editing.input}
          jersey={editing.player}
          payload={editing.payload}
          onSubmit={submitEdit}
          onClose={() => setEditing(null)}
          roster={roster}
          side={
            editing.team !== null && editing.team === log.away.name
              ? "away"
              : "home"
          }
          teamName={editing.team ?? "–"}
        />
      ) : null}

      {sheet !== null &&
      possessionSide !== null &&
      possessionName !== null &&
      (sheet.kind === "touchdown" ||
        sheet.kind === "series" ||
        sheet.kind === "moremenu" ||
        opponentName !== null) ? (
        sheet.kind === "play" ? (
          <PlaySheet
            drive={drive}
            geometry={geometry}
            initialResult={sheet.result}
            initialType={sheet.type}
            lastQuarterback={readQuarterback(game.id, possessionSide)}
            onClose={() => setSheet(null)}
            onSubmit={submitPlay}
            opponentName={opponentName ?? "Gegner"}
            roster={roster}
            side={possessionSide}
            teamName={possessionName}
          />
        ) : sheet.kind === "fieldpos" ? (
          <FieldPositionSheet
            ballOn={drive.ballOn}
            down={drive.down}
            goal={drive.goal}
            onClose={() => setSheet(null)}
            onSubmit={(event) => submit([event])}
            teamName={possessionName}
          />
        ) : sheet.kind === "challenge" ? (
          <ChallengeSheet
            onClose={() => setSheet(null)}
            onSubmit={(event) => submit([event])}
            teamName={possessionName}
          />
        ) : sheet.kind === "touchdown" ? (
          <TouchdownSheet
            onClose={() => setSheet(null)}
            onSubmit={submitTouchdown}
            passcheck={game.passcheck === true}
            recent={recentJerseys}
            roster={roster}
            side={possessionSide}
            teamName={possessionName}
          />
        ) : sheet.kind === "series" ? (
          // Completing a one-tap interception: the defender already has the
          // ball, so the sheet sees the possession from before the tap.
          replacing !== null &&
          sheet.mode === "interception" &&
          opponentName !== null &&
          opponentSide !== null ? (
            <SeriesSheet
              key={sheet.mode}
              half={half}
              mode={sheet.mode}
              onClose={closeSheet}
              onSubmit={submitSeries}
              opponentName={possessionName}
              perHalf={timeoutsPerHalf}
              roster={roster}
              side={opponentSide}
              teamName={opponentName}
              timeouts={timeouts}
            />
          ) : (
            <SeriesSheet
              key={sheet.mode}
              half={half}
              mode={sheet.mode}
              onClose={closeSheet}
              onSubmit={submitSeries}
              opponentName={opponentName ?? "–"}
              perHalf={timeoutsPerHalf}
              roster={roster}
              side={possessionSide}
              teamName={possessionName}
              timeouts={timeouts}
            />
          )
        ) : sheet.kind === "penalty" ? (
          <PenaltySheet
            ballOn={drive.ballOn}
            history={unsportsmanlike}
            rules={rules}
            onClose={() => setSheet(null)}
            onSubmit={submit}
            opponentName={opponentName ?? ""}
            roster={roster}
            side={possessionSide}
            teamName={possessionName}
          />
        ) : sheet.kind === "moremenu" ? (
          <MoreMenuSheet
            disabled={composerDisabled}
            onClose={() => setSheet(null)}
            onPick={pickFromMenu}
          />
        ) : (
          <MoreSheet
            key={sheet.mode}
            mode={sheet.mode}
            onClose={() => setSheet(null)}
            onSubmit={submit}
            opponentName={opponentName ?? ""}
            roster={roster}
            side={possessionSide}
            teamName={possessionName}
          />
        )
      ) : null}

      {halftimeOpen ? (
        <HalftimeSheet
          away={logTeamName(officialLog.away) ?? "–"}
          awayScore={officialLog.away.score}
          direction={(() => {
            const first = directionFromWire(setup?.direction ?? undefined);
            return first === "Nord" ? "Süd" : first === "Süd" ? "Nord" : null;
          })()}
          disabled={halftimeDisabled}
          error={halftimeError}
          home={logTeamName(officialLog.home) ?? "–"}
          homeScore={officialLog.home.score}
          intermissionMinutes={
            rules?.periods?.intermission_minutes ?? 2
          }
          onClose={() => setHalftimeOpen(false)}
          onStart={() => void startHalftime()}
          possession={
            secondHalfPossession(
              setup,
              logTeamName(log.home),
              logTeamName(log.away),
            ) ?? opponentName
          }
          setup={setup}
        />
      ) : null}

      {timeoutTeam !== null ? (
        <TimeoutSheet
          disabled={readOnly}
          half={half}
          key={timeoutTeam}
          onSubmit={(gameTime) => takeTimeout(timeoutTeam, gameTime)}
          onClose={() => setTimeoutTeam(null)}
          onTeam={(team) => setTimeoutTeam(team)}
          opponentName={
            timeoutTeam === possessionName ? opponentName : possessionName
          }
          perHalf={timeoutsPerHalf}
          seconds={rules?.timeouts?.seconds ?? 60}
          teamName={timeoutTeam}
          timeouts={timeouts}
          used={
            timeoutBudget(rows, timeoutTeam, half, timeoutsPerHalf).used
          }
        />
      ) : null}
    </div>
  );
}
