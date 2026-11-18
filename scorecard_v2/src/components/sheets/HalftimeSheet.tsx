import type { ReactNode } from "react";

import type { GameSetup } from "../../api/types";
import DirectionText, {
  directionFromWire,
  type Direction,
} from "../DirectionText";
import Sheet from "./Sheet";

/** The half-time facts the officials confirm before the break starts. */
export interface HalftimeFacts {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  /** Team that receives the second-half kickoff, or `null` when unknown. */
  possession: string | null;
  /** The direction the second half plays toward ("Nord" / "Süd"). */
  direction: string | null;
  /** The definition's intermission, in minutes. */
  intermissionMinutes: number;
  /**
   * The setup written at kick-off: the coin toss, the opening possession and
   * the first-half direction. The sheet restates them so the officials can see
   * who plays from where to where and who starts with the ball.
   */
  setup?: GameSetup | null;
}

/** The other end zone; `null` stays unknown. */
export function oppositeDirection(direction: Direction | null): Direction | null {
  if (direction === null) {
    return null;
  }
  return direction === "Nord" ? "Süd" : "Nord";
}

/**
 * The side a stored setup value names.
 *
 * v2 writes `home`/`away`, the old app wrote the team name, and legacy toss
 * values (`gewonnen`/`verloren`) are relative to the away team — the side that
 * always calls the coin toss.
 */
function setupSide(
  value: string | undefined,
  home: string,
  away: string,
): "home" | "away" | null {
  const token = (value ?? "").trim().toLowerCase();
  if (token === "home" || token === home.trim().toLowerCase()) {
    return "home";
  }
  if (token === "away" || token === away.trim().toLowerCase()) {
    return "away";
  }
  return null;
}

/** The coin-toss winner as the sheet names it; `null` when not recorded. */
export function tossWinnerName(
  setup: GameSetup | null | undefined,
  home: string,
  away: string,
): string | null {
  const token = setup?.ctResult?.trim().toLowerCase() ?? "";
  if (token === "gewonnen" || token === "won") {
    return away;
  }
  if (token === "verloren" || token === "lost") {
    return home;
  }
  const side = setupSide(setup?.ctResult, home, away);
  return side === null ? null : side === "home" ? home : away;
}

/** The team that received the opening kickoff; `null` when not recorded. */
export function firstHalfPossessionName(
  setup: GameSetup | null | undefined,
  home: string,
  away: string,
): string | null {
  const side = setupSide(setup?.fhPossession, home, away);
  return side === null ? null : side === "home" ? home : away;
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="startrow">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * **Halbzeit**: restate the score, the coin toss and who gets the ball, then
 * start the break.
 *
 * The old two-tap arm on the button became this dialog. The second-half
 * possession is derived from the setup, never from whoever happened to hold the
 * ball last. Showing the coin toss makes the rest readable: the team that
 * receives the second-half kickoff attacks the first half's direction, the
 * other team turns around.
 */
export default function HalftimeSheet({
  home,
  away,
  homeScore,
  awayScore,
  possession,
  direction,
  intermissionMinutes,
  setup = null,
  busy = false,
  error = null,
  disabled = false,
  onStart,
  onClose,
}: HalftimeFacts & {
  busy?: boolean;
  error?: string | null;
  disabled?: boolean;
  onStart: () => void;
  onClose: () => void;
}) {
  const toss = tossWinnerName(setup, home, away);
  const firstHalfPossession = firstHalfPossessionName(setup, home, away);
  const firstHalfDirection = directionFromWire(setup?.direction);
  const fallback = directionFromWire(direction ?? undefined);
  // The team with the second-half kickoff starts on offense and attacks the
  // end zone the first half played toward; the other side turns around.
  const receivingDirection = firstHalfDirection ?? oppositeDirection(fallback);
  const otherDirection = oppositeDirection(receivingDirection);
  const otherTeam =
    possession === home ? away : possession === away ? home : null;

  return (
    <Sheet
      busy={busy}
      error={error}
      footer={
        <button
          className="startbtn"
          disabled={busy || disabled}
          onClick={onStart}
          type="button"
        >
          {busy ? "Halbzeit …" : "Halbzeit starten"}
        </button>
      }
      onClose={onClose}
      title="Halbzeit"
    >
      <p className="sheetnote">
        {homeScore} : {awayScore} · {home} – {away}
      </p>

      <h3 className="sheetsection">Münzwurf</h3>
      <dl aria-label="Münzwurf" className="startlist">
        <Line label="Münzwurf gewonnen von">{toss ?? "–"}</Line>
        <Line label="Erster Ballbesitz">{firstHalfPossession ?? "–"}</Line>
        <Line label="Ballbesitz 2. Halbzeit">
          {possession ?? "–"}
          {possession === null ? null : (
            <span className="startopt"> startet mit dem Ball</span>
          )}
        </Line>
      </dl>

      <h3 className="sheetsection">Spielrichtung 2. Halbzeit</h3>
      <dl aria-label="Spielrichtung 2. Halbzeit" className="startlist">
        {possession !== null &&
        otherTeam !== null &&
        receivingDirection !== null &&
        otherDirection !== null ? (
          <>
            <Line label={possession}>
              <DirectionText target={receivingDirection} />
            </Line>
            <Line label={otherTeam}>
              <DirectionText target={otherDirection} />
            </Line>
          </>
        ) : (
          <Line label="Spielrichtung">
            {fallback === null ? "–" : <DirectionText target={fallback} />}
          </Line>
        )}
      </dl>

      <dl aria-label="Pause" className="startlist">
        <Line label="Pause">{intermissionMinutes} Minuten</Line>
      </dl>

      <p className="sheetnote">
        Der zweite Ballbesitz kommt aus der Vorbereitung: die Mannschaft, die
        den Anstoß nicht hatte. Die Richtung nennt die Endzone, die die
        Mannschaft angreift; die Seiten werden in der Halbzeit getauscht.
      </p>
    </Sheet>
  );
}
