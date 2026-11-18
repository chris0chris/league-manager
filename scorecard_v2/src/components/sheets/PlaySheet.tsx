import { useRef, useState } from "react";

import type { GameLogEventInput, RosterPlayer } from "../../api/types";
import {
  advance,
  DEFAULT_GEOMETRY,
  driveSpotText,
  driveText,
  interceptionReturnSpot,
  isTurnoverOnDowns,
  type DriveState,
  type Geometry,
  spotText,
} from "../../app/drive";
import JerseyPicker from "../JerseyPicker";
import QuarterbackPick from "../QuarterbackPick";
import { Check } from "../icons";
import { errorMessage } from "./errors";
import { interceptionEvent } from "./SeriesSheet";
import { spotValue } from "./FieldPositionSheet";
import Sheet from "./Sheet";
import { yardsText, yardsValue } from "./yards";

/** The three scrimmage plays the scorecard records. */
export type PlayType = "pass" | "run" | "sack";

/** What the play produced; the wizard's second step. */
export type PlayResult =
  | "gain"
  | "incomplete"
  | "touchdown"
  | "safety"
  | "interception";

const TITLES: Record<PlayType, string> = {
  pass: "Pass",
  run: "Run",
  sack: "Sack",
};

/** The row name the event store projects for one play. */
export function playName(type: PlayType, complete: boolean): string {
  if (type === "pass") {
    return complete ? "Pass" : "Pass unvollständig";
  }
  return TITLES[type];
}

/**
 * The visible text of a play, built once here and sent as the event's `input`
 * so the optimistic row and the server's projection read the same.
 */
export function playInput({
  type,
  complete,
  yards,
  qb,
  defender = null,
  deflection = false,
}: {
  type: PlayType;
  complete: boolean;
  yards: number;
  qb: number | null;
  defender?: number | null;
  deflection?: boolean;
}): string {
  const parts: string[] = [];
  if (type === "sack") {
    parts.push(yardsText(yards, { loss: true }));
  } else if (type !== "pass" || complete) {
    parts.push(yardsText(yards));
  }
  if (type === "pass" && qb !== null) {
    parts.push(`QB #${qb}`);
  }
  if (defender !== null && type !== "sack") {
    parts.push(deflection ? `Deflection #${defender}` : `Tackle #${defender}`);
  }
  return parts.join(" · ");
}

/**
 * One play as the event store takes it.
 *
 * `player` is the jersey the play belongs to (receiver, runner, sacked
 * quarterback). `payload` carries the structured record for the statistics
 * that come later: `yards` **signed** (a sack is a loss), `qb` for a pass and
 * `complete` for a pass. `input` is the text the log and the ticker show.
 */
export function playEvent({
  type,
  complete,
  yards,
  qb,
  player,
  defender = null,
  deflection = false,
}: {
  type: PlayType;
  complete: boolean;
  yards: number;
  qb: number | null;
  player: number | null;
  defender?: number | null;
  deflection?: boolean;
}): GameLogEventInput {
  const payload: Record<string, unknown> = {
    yards: type === "sack" ? -Math.abs(yards) : yards,
  };
  if (type === "pass") {
    payload.complete = complete;
    if (qb !== null) {
      payload.qb = qb;
    }
  }
  if (defender !== null && type !== "sack") {
    // The defender is the *other* team's player; the play's `player` stays the
    // offense's. Both are jersey numbers, the side comes from the event.
    payload.defense = deflection
      ? { player: defender, deflection: true }
      : { player: defender };
  }
  const event: GameLogEventInput = {
    name: playName(type, complete),
    input: playInput({ type, complete, yards, qb, defender, deflection }),
    payload,
  };
  if (player !== null) {
    event.player = player;
  }
  return event;
}

/** An interception as the result of a play, with its return details. */
export interface PlayInterception {
  /** Where the return ended (own-goal-based 0–50), or `null` for a touchback. */
  deadBall: number | null;
  /** Return yards, statistics only. */
  returnYards: number | null;
  /** The defender carried it back for a touchdown. */
  pickSix: boolean;
}

/**
 * The events of one play: the play itself and, when it scored or changed
 * hands, its result row.
 *
 * The touchdown is the **result of the play entry**, not a separate step
 * (meeting 2026-11-05, 53:05). Both rows go in one submission, so they share
 * one `TeamLog.sequence`. A safety and an interception are credited to the
 * **defence**, so they carry `payload.defense: true`; the screen writes them
 * for the opponent (the play itself stays with the offence). A pick six adds
 * the defending team's touchdown.
 *
 * A touchdown counts without a number (IFAF R 8-1-1: the points are the
 * team's, the jersey is detail) — the row then simply names nobody.
 */
export function playEvents(options: {
  type: PlayType;
  complete: boolean;
  yards: number;
  qb: number | null;
  player: number | null;
  defender?: number | null;
  deflection?: boolean;
  touchdown?: boolean;
  safety?: boolean;
  interception?: PlayInterception | null;
}): GameLogEventInput[] {
  const play = playEvent(options);
  if (options.interception !== undefined && options.interception !== null) {
    const { deadBall, returnYards, pickSix } = options.interception;
    const interception = interceptionEvent(
      options.defender ?? null,
      deadBall,
      returnYards,
    );
    interception.payload = {
      ...(interception.payload ?? {}),
      defense: true,
    };
    const events = [play, interception];
    if (pickSix) {
      events.push({
        name: "Touchdown",
        ...(options.defender === null || options.defender === undefined
          ? {}
          : { player: options.defender }),
        payload: { defense: true },
      });
    }
    return events;
  }
  if (options.safety === true) {
    return [play, { name: "Safety (+2)", payload: { defense: true } }];
  }
  if (options.touchdown !== true) {
    return [play];
  }
  return [
    play,
    options.player === null
      ? { name: "Touchdown" }
      : { name: "Touchdown", player: options.player },
  ];
}

/** The results a play type can produce, in the wizard's order. */
export function resultOptions(type: PlayType): {
  value: PlayResult;
  label: string;
}[] {
  if (type === "pass") {
    return [
      { value: "gain", label: "Complete" },
      { value: "incomplete", label: "Incomplete" },
      { value: "touchdown", label: "Touchdown" },
      { value: "safety", label: "Safety" },
      { value: "interception", label: "Interception" },
    ];
  }
  if (type === "run") {
    return [
      { value: "gain", label: "Raumgewinn" },
      { value: "touchdown", label: "Touchdown" },
      { value: "safety", label: "Safety" },
    ];
  }
  return [
    { value: "gain", label: "Sack" },
    { value: "safety", label: "Safety" },
  ];
}

/** One step of the wizard; sections that do not apply are skipped. */
type Step =
  | "type"
  | "result"
  | "distance"
  | "qb"
  | "qbplayer"
  | "player"
  | "defender"
  | "interception";

export function stepsFor(type: PlayType, result: PlayResult): Step[] {
  const steps: Step[] = ["type", "result"];
  if (result === "interception") {
    // The defender's sheet follows; the passer is the only jersey still asked.
    if (type === "pass") {
      steps.push("qb");
    }
    steps.push("interception");
    return steps;
  }
  if (type === "pass") {
    // The quarterback is the same person in 95% of the passes, so the passer
    // and the receiver share one step instead of a second "Weiter".
    steps.push("qbplayer");
    // A touchdown has no tackle to record: the receiver scored.
    if (result !== "touchdown") {
      steps.push("defender");
    }
  } else {
    steps.push("player");
    // A touchdown has no tackle to record: the runner scored.
    if (type !== "sack" && result !== "touchdown") {
      steps.push("defender");
    }
  }
  // The field position comes last (scorer feedback, 2026-11-17): the numbers
  // are typed first, the spot confirms the result — and the preview under it
  // shows the down & distance before the save.
  if (result === "gain" || result === "touchdown" || result === "safety") {
    steps.push("distance");
  }
  return steps;
}

/** The play's result text for the summary line under the progress dots. */
function resultLabel(type: PlayType, result: PlayResult): string {
  return (
    resultOptions(type).find((option) => option.value === result)?.label ??
    result
  );
}

/** `A12` / `B4,5` for a spot; the wizard's live preview uses `spotText`. */
function spotFrom(
  side: "A" | "B",
  raw: string,
  g: Geometry = DEFAULT_GEOMETRY,
): number | null {
  const distance = spotValue(raw);
  if (distance === null || distance < 0 || distance > g.middle) {
    return null;
  }
  return side === "A" ? distance : g.fieldLength - distance;
}

/**
 * The half a spot is on, in the A/B language of the spot pickers.
 *
 * The wizard opens on the half the ball is on: past the middle is the
 * opponent's (B), everything before it — and the middle itself — the own (A).
 */
function halfOf(
  ballOn: number | null,
  g: Geometry = DEFAULT_GEOMETRY,
): "A" | "B" {
  return ballOn !== null && ballOn > g.middle ? "B" : "A";
}

interface PlaySheetProps {
  /** Possession team as the API knows it. */
  teamName: string;
  /** Side of the possession team, for the jersey lists. */
  side: RosterPlayer["side"];
  /** Both sides as loaded from the API, `null` while the request runs. */
  roster: RosterPlayer[] | null;
  /** The other team's name, printed above its defence picker. */
  opponentName?: string;
  /** The last quarterback of this side, pre-selected on a pass. */
  lastQuarterback?: number | null;
  /** The series the play runs from, for the end spot and the preview. */
  drive?: DriveState | null;
  /** The field the preview calculates with. */
  geometry?: Geometry;
  /** Type preselected by the board tile that opened the wizard (L5). */
  initialType?: PlayType;
  /** Result preselected by an Interception tile (L5). */
  initialResult?: PlayResult;
  onSubmit: (events: GameLogEventInput[]) => Promise<void>;
  onClose: () => void;
}

/**
 * The play-by-play entry as a wizard: **type → result → QB/receiver (or
 * runner) → tackler → field position**, each step only when it applies.
 *
 * The numbers come first and the field position last (scorer feedback,
 * 2026-11-17): the spot is what confirms the play, and its preview shows the
 * resulting down & distance right above the save button. The passer and the
 * receiver share one step (the same QB throws 95% of the passes); an
 * interception keeps the passer alone because the defender's details follow.
 * The distance can be typed as yards or as a **Feldposition** (A/B + yard
 * line), and the sheet previews the resulting down & distance from the same
 * `advance` the board uses. A touchdown prefills the distance to the goal line
 * and hides the loss switch; a safety prefills the run to the own goal line.
 *
 * An interception asks for the defender, the catch spot and the return — both
 * in the throwing offence's orientation, because the field only turns when the
 * intercepting team's series starts (`interceptionReturnSpot`) — and an
 * optional pick six.
 */
export default function PlaySheet({
  teamName,
  side,
  roster,
  opponentName = "Gegner",
  lastQuarterback = null,
  drive = null,
  geometry = DEFAULT_GEOMETRY,
  initialType = "pass",
  initialResult = "gain",
  onSubmit,
  onClose,
}: PlaySheetProps) {
  const [type, setType] = useState<PlayType>(initialType);
  const [result, setResult] = useState<PlayResult>(initialResult);
  const [stepIndex, setStepIndex] = useState(0);
  const [jersey, setJersey] = useState<number | null>(null);
  const [qb, setQb] = useState<number | null>(lastQuarterback);
  const [defender, setDefender] = useState<number | null>(null);
  const [deflection, setDeflection] = useState(false);
  const [yardsText, setYardsText] = useState("0");
  const [loss, setLoss] = useState(false);
  const [distanceMode, setDistanceMode] = useState<"yards" | "end">("yards");
  // Both spot pickers open on the half the ball is on: the operator only
  // confirms the line instead of also choosing the side (scorer feedback).
  const [endSide, setEndSide] = useState<"A" | "B">(() =>
    halfOf(drive?.ballOn ?? null, geometry),
  );
  const [endYards, setEndYards] = useState("");
  const [catchSide, setCatchSide] = useState<"A" | "B">(() =>
    halfOf(drive?.ballOn ?? null, geometry),
  );
  const [catchYards, setCatchYards] = useState("");
  const [returnYards, setReturnYards] = useState("");
  const [pickSix, setPickSix] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Two synchronous taps must not both write a play.
  const saving = useRef(false);

  const players =
    roster === null ? [] : roster.filter((player) => player.side === side);
  const defenders =
    roster === null ? [] : roster.filter((player) => player.side !== side);
  const steps = stepsFor(type, result);
  const index = Math.min(stepIndex, steps.length - 1);
  const step = steps[index];

  const magnitude = Math.abs(yardsValue(yardsText) ?? 0);
  const endSpot = spotFrom(endSide, endYards, geometry);
  const typedSpot =
    distanceMode === "end" && endSpot !== null && drive?.ballOn != null
      ? endSpot - drive.ballOn
      : null;
  let playYards =
    typedSpot ?? (loss || type === "sack" ? -magnitude : magnitude);
  if (result === "touchdown") {
    playYards = Math.abs(playYards);
  }
  if (result === "safety") {
    playYards = -Math.abs(playYards);
  }
  const catchSpot = spotFrom(catchSide, catchYards, geometry);
  const catchInvalid = catchYards.trim() !== "" && catchSpot === null;
  // A pick six is a touchdown, not a spot: its ball is dead in the end zone.
  const deadBall = pickSix
    ? null
    : interceptionReturnSpot(catchSpot, yardsValue(returnYards), geometry);
  const distanceMissing =
    distanceMode === "end"
      ? endSpot === null || drive?.ballOn == null
      : yardsValue(yardsText) === null;
  const qbMissing = type === "pass" && qb === null;

  const next = drive === null ? null : advance(drive, playYards, geometry);
  // A failed fourth down flips the ball; `advance` alone would show the new
  // series as if the offence still had it. Name the turnover instead.
  const turnoverOnDowns =
    drive !== null && isTurnoverOnDowns(drive, playYards, geometry);
  const preview =
    result === "touchdown"
      ? "Touchdown"
      : result === "safety"
        ? "Safety"
        : turnoverOnDowns
          ? "Turnover on downs"
          : next === null
            ? null
            : `${driveText(next)}${driveSpotText(next, geometry)}`;

  const stepReady =
    step === "distance"
      ? !distanceMissing
      : step === "qb" || step === "qbplayer"
        ? !qbMissing
        : step === "interception"
          ? !catchInvalid
          : true;

  const changeType = (option: PlayType): void => {
    setType(option);
    const allowed = resultOptions(option).map((entry) => entry.value);
    if (!allowed.includes(result)) {
      setResult("gain");
      setYardsText("0");
    }
  };

  const chooseResult = (option: PlayResult): void => {
    setResult(option);
    setLoss(false);
    if (option === "touchdown" && drive?.ballOn != null) {
      // The distance to the goal line is the play's gain (T5).
      setDistanceMode("yards");
      setYardsText(String(geometry.fieldLength - drive.ballOn));
    } else if (option === "safety" && drive?.ballOn != null) {
      setDistanceMode("yards");
      setYardsText(String(drive.ballOn));
    } else if (option === "gain") {
      setYardsText("0");
    }
  };

  const changeYards = (raw: string): void => {
    if (raw.includes("-")) {
      setLoss(true);
    }
    setYardsText(raw.replace(/-/g, ""));
  };

  const save = async (): Promise<void> => {
    if (saving.current || !stepReady || posting) {
      return;
    }
    saving.current = true;
    setPosting(true);
    setError(null);
    try {
      const interception =
        result === "interception"
          ? {
              deadBall,
              returnYards: pickSix ? null : yardsValue(returnYards),
              pickSix,
            }
          : null;
      await onSubmit(
        playEvents({
          type,
          complete: result !== "incomplete" && result !== "interception",
          yards: playYards,
          qb,
          player: result === "interception" ? null : jersey,
          defender: type === "sack" ? null : defender,
          deflection: type === "pass" && result === "incomplete" && deflection,
          touchdown: result === "touchdown",
          safety: result === "safety",
          interception,
        }),
      );
      onClose();
    } catch (failure) {
      saving.current = false;
      setPosting(false);
      setError(
        errorMessage(
          failure,
          "Der Spielzug konnte nicht gespeichert werden. Bitte erneut versuchen.",
        ),
      );
    }
  };

  const last = index === steps.length - 1;
  const footer = (
    <div className="sheetfootrow">
      {index === 0 ? null : (
        <button
          className="sheetback"
          disabled={posting}
          onClick={() => setStepIndex(index - 1)}
          type="button"
        >
          Zurück
        </button>
      )}
      {last ? (
        <button
          className="startbtn"
          disabled={posting || !stepReady}
          onClick={() => void save()}
          type="button"
        >
          {posting ? "Speichern …" : "Spielzug speichern"}
        </button>
      ) : (
        <button
          className="startbtn"
          disabled={!stepReady}
          onClick={() => setStepIndex(index + 1)}
          type="button"
        >
          Weiter
        </button>
      )}
    </div>
  );

  return (
    <Sheet
      busy={posting}
      error={error}
      footer={footer}
      onClose={onClose}
      title={`Spielzug · ${teamName}`}
    >
      <p className="sheetnote">
        Schritt {index + 1} von {steps.length} · {TITLES[type]} ·{" "}
        {resultLabel(type, result)}
      </p>

      {step === "type" ? (
        <>
          <h3 className="sheetsection">Spielzug</h3>
          <div aria-label="Spielzug" className="seg" role="group">
            {(Object.keys(TITLES) as PlayType[]).map((option) => (
              <button
                aria-pressed={type === option}
                className={type === option ? "sel" : undefined}
                disabled={posting}
                key={option}
                onClick={() => changeType(option)}
                type="button"
              >
                {TITLES[option]}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {step === "result" ? (
        <>
          <h3 className="sheetsection">Ergebnis</h3>
          <div aria-label="Ergebnis" className="seg" role="group">
            {resultOptions(type).map((option) => (
              <button
                aria-pressed={result === option.value}
                className={result === option.value ? "sel" : undefined}
                disabled={posting}
                key={option.value}
                onClick={() => chooseResult(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {step === "distance" ? (
        <>
          <h3 className="sheetsection">
            {result === "safety"
              ? "Raumverlust bis zur eigenen Endzone"
              : result === "touchdown"
                ? "Raumgewinn bis zur Endzone"
                : type === "sack"
                  ? "Raumverlust"
                  : "Raumgewinn / Verlust"}
          </h3>
          <div aria-label="Distanz" className="seg" role="group">
            <button
              aria-pressed={distanceMode === "yards"}
              className={distanceMode === "yards" ? "sel" : undefined}
              disabled={posting}
              onClick={() => setDistanceMode("yards")}
              type="button"
            >
              Yards
            </button>
            <button
              aria-pressed={distanceMode === "end"}
              className={distanceMode === "end" ? "sel" : undefined}
              disabled={posting || result !== "gain"}
              onClick={() => setDistanceMode("end")}
              type="button"
            >
              Feldposition
            </button>
          </div>

          {distanceMode === "yards" ? (
            <div className="sheetfield">
              <label className="sheetlabel" htmlFor="play-yards">
                {type === "sack" || result === "safety"
                  ? "Raumverlust (Yards)"
                  : "Raumgewinn / Verlust (Yards)"}
              </label>
              <input
                autoComplete="off"
                className="sheetinput sheetinput-num"
                disabled={posting}
                id="play-yards"
                inputMode="numeric"
                onChange={(event) => changeYards(event.target.value)}
                onFocus={(event) => event.target.select()}
                pattern="[0-9]*"
                type="text"
                value={yardsText}
              />
            </div>
          ) : (
            <>
              <div aria-label="Feldhälfte" className="seg" role="group">
                <button
                  aria-pressed={endSide === "A"}
                  className={endSide === "A" ? "sel" : undefined}
                  disabled={posting}
                  onClick={() => setEndSide("A")}
                  type="button"
                >
                  A · eigene
                </button>
                <button
                  aria-pressed={endSide === "B"}
                  className={endSide === "B" ? "sel" : undefined}
                  disabled={posting}
                  onClick={() => setEndSide("B")}
                  type="button"
                >
                  B · gegnerische
                </button>
              </div>
              <div className="sheetfield">
                <label className="sheetlabel" htmlFor="play-end">
                  Feldposition (0–25)
                </label>
                <input
                  autoComplete="off"
                  className="sheetinput sheetinput-num"
                  disabled={posting}
                  id="play-end"
                  inputMode="decimal"
                  onChange={(event) => setEndYards(event.target.value)}
                  onFocus={(event) => event.target.select()}
                  pattern="[0-9.,]*"
                  type="text"
                  value={endYards}
                />
              </div>
            </>
          )}

          {result === "gain" && type !== "sack" ? (
            <div aria-label="Raumrichtung" className="seg" role="group">
              <button
                aria-pressed={!loss}
                className={!loss ? "sel" : undefined}
                disabled={posting}
                onClick={() => setLoss(false)}
                type="button"
              >
                Gewinn
              </button>
              <button
                aria-pressed={loss}
                className={loss ? "sel" : undefined}
                disabled={posting}
                onClick={() => setLoss(true)}
                type="button"
              >
                Verlust
              </button>
            </div>
          ) : null}

          {preview === null ? null : (
            <p aria-live="polite" className="playpreview" role="status">
              <Check size={18} />
              <span>{preview}</span>
            </p>
          )}
        </>
      ) : null}

      {step === "qb" || step === "qbplayer" ? (
        <>
          <h3 className="sheetsection">Quarterback</h3>
          <QuarterbackPick
            disabled={posting}
            onChange={setQb}
            roster={roster}
            side={side}
            value={qb}
          />
          {qbMissing ? (
            <p className="sheetwarn" role="alert">
              Bitte den Quarterback wählen.
            </p>
          ) : null}
        </>
      ) : null}

      {step === "qbplayer" || step === "player" ? (
        <>
          <h3 className="sheetsection">
            {type === "sack"
              ? "Trikotnummer (Sack)"
              : step === "qbplayer"
                ? "Trikotnummer (Passempfänger, optional)"
                : "Trikotnummer (optional)"}
          </h3>
          <JerseyPicker
            disabled={posting}
            groupLabel="Trikotnummer"
            label="Trikot"
            onChange={setJersey}
            optionalLabel="Ohne Nummer"
            players={players}
            value={jersey}
          />
        </>
      ) : null}

      {step === "defender" ? (
        <>
          {type === "pass" && result === "incomplete" ? (
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
          ) : null}
          <h3 className="sheetsection">
            {type === "pass" && result === "incomplete" && deflection
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
        </>
      ) : null}

      {step === "interception" ? (
        <>
          <h3 className="sheetsection">
            Trikotnummer Verteidiger (optional)
          </h3>
          <JerseyPicker
            disabled={posting}
            groupLabel="Trikotnummer Verteidiger"
            label="Defense"
            onChange={setDefender}
            optionalLabel="Ohne Nummer"
            players={defenders}
            value={defender}
          />
          <h3 className="sheetsection">Gefangen an (optional)</h3>
          <div aria-label="Feldhälfte" className="seg" role="group">
            <button
              aria-pressed={catchSide === "A"}
              className={catchSide === "A" ? "sel" : undefined}
              disabled={posting}
              onClick={() => setCatchSide("A")}
              type="button"
            >
              A · eigene
            </button>
            <button
              aria-pressed={catchSide === "B"}
              className={catchSide === "B" ? "sel" : undefined}
              disabled={posting}
              onClick={() => setCatchSide("B")}
              type="button"
            >
              B · gegnerische
            </button>
          </div>
          <div className="sheetfield">
            <label className="sheetlabel" htmlFor="interception-catch">
              Feldposition (0–25)
            </label>
            <input
              autoComplete="off"
              className="sheetinput sheetinput-num"
              disabled={posting}
              id="interception-catch"
              inputMode="decimal"
              onChange={(event) => setCatchYards(event.target.value)}
              pattern="[0-9.,]*"
              type="text"
              value={catchYards}
            />
          </div>
          {catchInvalid ? (
            <p className="sheetwarn" role="alert">
              Die Feldposition liegt zwischen 0 und 25.
            </p>
          ) : (
            <p className="sheetnote">
              Fangstelle und Return aus Sicht des werfenden Teams: A eigene
              Hälfte, B angegriffene. Ohne Angabe beginnt der neue Angriff an
              der eigenen 5 (Touchback).
              {deadBall === null
                ? ""
                : ` Ballbesitz ab ${spotText(deadBall, geometry)}.`}
            </p>
          )}
          <div className="sheetfield">
            <label className="sheetlabel" htmlFor="interception-return">
              Return-Yards (optional)
            </label>
            <input
              autoComplete="off"
              className="sheetinput sheetinput-num"
              disabled={posting}
              id="interception-return"
              inputMode="numeric"
              onChange={(event) => {
                setReturnYards(event.target.value);
                // Return yards and a pick six describe the same run: typing a
                // number means the defender was tackled, not in the endzone.
                if (event.target.value.trim() !== "") {
                  setPickSix(false);
                }
              }}
              onFocus={(event) => event.target.select()}
              pattern="[0-9]*"
              type="text"
              value={returnYards}
            />
          </div>
          <div aria-label="Pick six" className="seg" role="group">
            <button
              aria-pressed={pickSix}
              className={pickSix ? "sel" : undefined}
              disabled={posting}
              onClick={() => {
                const next = !pickSix;
                setPickSix(next);
                // A touchdown has no return yardage to record.
                if (next) {
                  setReturnYards("");
                }
              }}
              type="button"
            >
              Pick six (Touchdown)
            </button>
          </div>
          <p className="sheetnote">
            Interception durch {opponentName}. Der Ballbesitz wechselt im
            Spielverlauf zu {opponentName}.
          </p>
        </>
      ) : null}
    </Sheet>
  );
}
